package com.pagopulse.agent.data.remote

import com.pagopulse.agent.core.CryptoUtils
import com.pagopulse.agent.core.PairingCredentials
import com.pagopulse.agent.data.local.PaymentQueueEntity
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

sealed class WebhookDeliveryResult {
    data object Synced : WebhookDeliveryResult()
    data class RetryableError(val reason: String) : WebhookDeliveryResult()
    data class TerminalError(val statusCode: Int, val reason: String) : WebhookDeliveryResult()
}

class IngestApiService(
    private val httpClient: OkHttpClient = defaultHttpClient
) {

    fun sendPaymentWebhook(
        credentials: PairingCredentials,
        entity: PaymentQueueEntity
    ): WebhookDeliveryResult {
        val payloadJson = JSONObject().apply {
            put("idempotencyKey", entity.idempotencyKey)
            put("wallet", entity.wallet)
            put("amount", entity.amount)
            put("senderName", entity.senderName)
            if (entity.securityCode != null) {
                put("securityCode", entity.securityCode)
            } else {
                put("securityCode", JSONObject.NULL)
            }
            put("rawNotification", entity.rawNotification)
            put("notifiedAt", entity.notifiedAtIso)
        }

        val rawBody = payloadJson.toString()
        val timestampEpochSeconds = System.currentTimeMillis() / 1000L
        val signature = CryptoUtils.computeHmacSignature(
            webhookSecret = credentials.webhookSecret,
            timestampEpochSeconds = timestampEpochSeconds,
            rawBody = rawBody
        )

        val request = Request.Builder()
            .url("${credentials.apiBaseUrl}/api/v1/ingest")
            .post(rawBody.toRequestBody(JSON_MEDIA_TYPE))
            .header("Content-Type", "application/json")
            .header("X-Device-Id", credentials.deviceId)
            .header("X-Timestamp", timestampEpochSeconds.toString())
            .header("X-Signature", signature)
            .build()

        return try {
            httpClient.newCall(request).execute().use { response ->
                when (response.code) {
                    200, 201 -> WebhookDeliveryResult.Synced
                    408, 429, in 500..599 -> WebhookDeliveryResult.RetryableError(
                        "HTTP ${response.code}: ${response.message}"
                    )
                    else -> WebhookDeliveryResult.TerminalError(
                        statusCode = response.code,
                        reason = "HTTP ${response.code}: ${response.body?.string().orEmpty().take(200)}"
                    )
                }
            }
        } catch (e: IOException) {
            WebhookDeliveryResult.RetryableError(e.message ?: "Network I/O error")
        }
    }

    fun sendHeartbeat(
        credentials: PairingCredentials,
        batteryLevel: Int?
    ): Boolean {
        val payloadJson = JSONObject().apply {
            if (batteryLevel != null && batteryLevel in 0..100) {
                put("batteryLevel", batteryLevel)
            }
        }
        val rawBody = payloadJson.toString()
        val timestampEpochSeconds = System.currentTimeMillis() / 1000L
        val signature = CryptoUtils.computeHmacSignature(
            webhookSecret = credentials.webhookSecret,
            timestampEpochSeconds = timestampEpochSeconds,
            rawBody = rawBody
        )

        val request = Request.Builder()
            .url("${credentials.apiBaseUrl}/api/v1/heartbeat")
            .post(rawBody.toRequestBody(JSON_MEDIA_TYPE))
            .header("Content-Type", "application/json")
            .header("X-Device-Id", credentials.deviceId)
            .header("X-Timestamp", timestampEpochSeconds.toString())
            .header("X-Signature", signature)
            .build()

        return try {
            httpClient.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (_: IOException) {
            false
        }
    }

    companion object {
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

        private val defaultHttpClient: OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }
}
