package com.pagopulse.agent.data.remote

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.pagopulse.agent.core.DevicePrefs
import com.pagopulse.agent.data.local.AppDatabase
import com.pagopulse.agent.data.local.SyncStatus
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class PaymentSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    private val dao = AppDatabase.getInstance(appContext).paymentQueueDao()
    private val devicePrefs = DevicePrefs(appContext)
    private val apiService = IngestApiService()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val credentials = devicePrefs.getPairingCredentials()
            ?: return@withContext Result.failure()

        val pendingItems = dao.getPendingBatch()
        if (pendingItems.isEmpty()) {
            return@withContext Result.success()
        }

        var shouldRetryBatch = false

        for (item in pendingItems) {
            when (val result = apiService.sendPaymentWebhook(credentials, item)) {
                is WebhookDeliveryResult.Synced -> {
                    dao.markSynced(item.id, SyncStatus.SYNCED)
                }
                is WebhookDeliveryResult.RetryableError -> {
                    dao.markAttemptFailed(
                        id = item.id,
                        errorMessage = result.reason,
                        status = SyncStatus.PENDING
                    )
                    shouldRetryBatch = true
                }
                is WebhookDeliveryResult.TerminalError -> {
                    dao.markAttemptFailed(
                        id = item.id,
                        errorMessage = result.reason,
                        status = SyncStatus.FAILED
                    )
                }
            }
        }

        if (shouldRetryBatch) {
            Result.retry()
        } else {
            Result.success()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "pagopulse_immediate_payment_sync"

        /**
         * Enqueues an expedited one-time sync job with network constraints and exponential backoff.
         */
        fun enqueueImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<PaymentSyncWorker>()
                .setConstraints(constraints)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    10L,
                    TimeUnit.SECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
                request
            )
        }
    }
}
