package com.pagopulse.agent.service

import android.app.Notification
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import com.pagopulse.agent.PagoPulseApp
import com.pagopulse.agent.core.CryptoUtils
import com.pagopulse.agent.core.DevicePrefs
import com.pagopulse.agent.data.local.AppDatabase
import com.pagopulse.agent.data.local.PaymentQueueEntity
import com.pagopulse.agent.data.local.SyncStatus
import com.pagopulse.agent.data.remote.PaymentSyncWorker
import com.pagopulse.agent.domain.NotificationParser
import com.pagopulse.agent.domain.ParsedPayment
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Persistent foreground NotificationListenerService that intercepts incoming
 * Yape and Plin notifications, filters spam, stores genuine payments into the
 * local Room SQLite queue, and triggers immediate WorkManager webhook delivery.
 */
class PaymentListenerService : NotificationListenerService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onListenerConnected() {
        super.onListenerConnected()
        promoteToForegroundService()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        promoteToForegroundService()
        return START_STICKY
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null || sbn.isOngoing) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification?.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        val regularText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        val bodyText = bigText?.ifBlank { regularText } ?: regularText

        val parsedPayment = NotificationParser.parse(
            packageName = packageName,
            title = title,
            text = bodyText
        ) ?: return

        val postTimeEpochMs = if (sbn.postTime > 0L) sbn.postTime else System.currentTimeMillis()
        persistAndEnqueueSync(parsedPayment, postTimeEpochMs)
    }

    private fun persistAndEnqueueSync(
        parsed: ParsedPayment,
        notifiedAtEpochMs: Long
    ) {
        serviceScope.launch {
            val prefs = DevicePrefs(applicationContext)
            val deviceId = prefs.getPairingCredentials()?.deviceId ?: "unpaired-local-device"

            // Bucket timestamp into 10-second windows so rapid duplicate Android notification
            // re-posts produce the exact same deterministic idempotency_key.
            val tenSecondBucket = notifiedAtEpochMs / 10_000L
            val amountFormatted = parsed.amount.toPlainString()

            val idempotencyKey = CryptoUtils.computeIdempotencyKey(
                deviceId = deviceId,
                wallet = parsed.wallet.name,
                amountFormatted = amountFormatted,
                senderName = parsed.senderName,
                securityCode = parsed.securityCode,
                notifiedBucketEpochTenSeconds = tenSecondBucket
            )

            val entity = PaymentQueueEntity(
                idempotencyKey = idempotencyKey,
                wallet = parsed.wallet.name,
                amount = parsed.amount.toDouble(),
                senderName = parsed.senderName,
                securityCode = parsed.securityCode,
                rawNotification = parsed.rawNotification,
                notifiedAtIso = Instant.ofEpochMilli(notifiedAtEpochMs).toString(),
                notifiedAtEpochMs = notifiedAtEpochMs,
                syncStatus = SyncStatus.PENDING
            )

            val dao = AppDatabase.getInstance(applicationContext).paymentQueueDao()
            val rowId = dao.enqueuePayment(entity)
            if (rowId != -1L) {
                PaymentSyncWorker.enqueueImmediateSync(applicationContext)
            }
        }
    }

    private fun promoteToForegroundService() {
        val notification = NotificationCompat.Builder(this, PagoPulseApp.LISTENER_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("PagoPulse Activo")
            .setContentText("Escuchando pagos de Yape y Plin en tiempo real")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                FOREGROUND_NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(FOREGROUND_NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    companion object {
        private const val FOREGROUND_NOTIFICATION_ID = 4101
    }
}
