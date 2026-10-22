package com.pagopulse.agent.service

import android.content.Context
import android.os.BatteryManager
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.pagopulse.agent.core.DevicePrefs
import com.pagopulse.agent.data.remote.IngestApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class HeartbeatWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    private val devicePrefs = DevicePrefs(appContext)
    private val apiService = IngestApiService()

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val credentials = devicePrefs.getPairingCredentials()
            ?: return@withContext Result.success()

        val batteryManager =
            applicationContext.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val batteryLevel = batteryManager
            ?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            ?.takeIf { it in 0..100 }

        val ok = apiService.sendHeartbeat(credentials, batteryLevel)
        if (ok) Result.success() else Result.retry()
    }

    companion object {
        private const val PERIODIC_WORK_NAME = "pagopulse_periodic_heartbeat"

        fun schedulePeriodic(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<HeartbeatWorker>(
                15L,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                PERIODIC_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }
}
