package com.pagopulse.agent

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.pagopulse.agent.service.HeartbeatWorker

class PagoPulseApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        HeartbeatWorker.schedulePeriodic(this)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                LISTENER_CHANNEL_ID,
                "Estado del Agente PagoPulse",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mantiene activo el detector de notificaciones de Yape y Plin en segundo plano."
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    companion object {
        const val LISTENER_CHANNEL_ID = "pagopulse_listener_channel"
    }
}
