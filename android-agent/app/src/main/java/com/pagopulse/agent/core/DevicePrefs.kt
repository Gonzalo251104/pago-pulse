package com.pagopulse.agent.core

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONObject

data class PairingCredentials(
    val organizationId: String,
    val deviceId: String,
    val deviceName: String,
    val webhookSecret: String,
    val apiBaseUrl: String
)

class DevicePrefs(context: Context) {

    private val prefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (_: Exception) {
        context.getSharedPreferences(PREFS_FILE_NAME, Context.MODE_PRIVATE)
    }

    fun savePairingCredentials(credentials: PairingCredentials) {
        prefs.edit()
            .putString(KEY_ORG_ID, credentials.organizationId)
            .putString(KEY_DEVICE_ID, credentials.deviceId)
            .putString(KEY_DEVICE_NAME, credentials.deviceName)
            .putString(KEY_WEBHOOK_SECRET, credentials.webhookSecret)
            .putString(KEY_API_BASE_URL, credentials.apiBaseUrl.trimEnd('/'))
            .apply()
    }

    fun saveFromQrJson(rawJson: String): Result<PairingCredentials> {
        return runCatching {
            val json = JSONObject(rawJson)
            val organizationId = json.getString("organizationId")
            val deviceId = json.optString("deviceId").ifBlank {
                json.getString("deviceToken")
            }
            val deviceName = json.optString("deviceName", "Teléfono Vinculado")
            val webhookSecret = json.getString("webhookSecret")
            val apiBaseUrl = json.optString("apiBaseUrl", DEFAULT_API_BASE_URL)

            require(organizationId.isNotBlank()) { "organizationId is required" }
            require(deviceId.isNotBlank()) { "deviceId is required" }
            require(webhookSecret.length >= 32) { "webhookSecret is invalid" }

            val credentials = PairingCredentials(
                organizationId = organizationId,
                deviceId = deviceId,
                deviceName = deviceName,
                webhookSecret = webhookSecret,
                apiBaseUrl = apiBaseUrl.trimEnd('/')
            )
            savePairingCredentials(credentials)
            credentials
        }
    }

    fun getPairingCredentials(): PairingCredentials? {
        val orgId = prefs.getString(KEY_ORG_ID, null) ?: return null
        val deviceId = prefs.getString(KEY_DEVICE_ID, null) ?: return null
        val secret = prefs.getString(KEY_WEBHOOK_SECRET, null) ?: return null
        val deviceName = prefs.getString(KEY_DEVICE_NAME, "Teléfono Android") ?: "Teléfono Android"
        val apiBaseUrl = prefs.getString(KEY_API_BASE_URL, DEFAULT_API_BASE_URL) ?: DEFAULT_API_BASE_URL

        return PairingCredentials(
            organizationId = orgId,
            deviceId = deviceId,
            deviceName = deviceName,
            webhookSecret = secret,
            apiBaseUrl = apiBaseUrl
        )
    }

    fun clearPairing() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS_FILE_NAME = "pagopulse_secure_device_prefs"
        private const val KEY_ORG_ID = "organization_id"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_WEBHOOK_SECRET = "webhook_secret"
        private const val KEY_API_BASE_URL = "api_base_url"
        const val DEFAULT_API_BASE_URL = "http://10.0.2.2:3000"
    }
}
