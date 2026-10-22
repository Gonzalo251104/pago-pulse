package com.pagopulse.agent.core

import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Cryptographic helpers for deterministic idempotency hashing (SHA-256)
 * and webhook payload signing (HMAC-SHA256).
 *
 * Pure JVM implementation with zero Android framework dependencies.
 */
object CryptoUtils {

    private const val HMAC_SHA256_ALGORITHM = "HmacSHA256"
    private const val SHA256_ALGORITHM = "SHA-256"

    /**
     * Computes `HMAC_SHA256(webhookSecret, "${timestamp}.${rawBody}")` as a 64-char lowercase hex string.
     */
    fun computeHmacSignature(
        webhookSecret: String,
        timestampEpochSeconds: Long,
        rawBody: String
    ): String {
        val canonicalMessage = "$timestampEpochSeconds.$rawBody"
        val mac = Mac.getInstance(HMAC_SHA256_ALGORITHM)
        val secretKey = SecretKeySpec(
            webhookSecret.toByteArray(StandardCharsets.UTF_8),
            HMAC_SHA256_ALGORITHM
        )
        mac.init(secretKey)
        val digest = mac.doFinal(canonicalMessage.toByteArray(StandardCharsets.UTF_8))
        return bytesToHex(digest)
    }

    /**
     * Computes a deterministic 64-char lowercase SHA-256 hex digest for deduplicating
     * notifications across Android grouped notification re-fires and WorkManager retries.
     */
    fun computeIdempotencyKey(
        deviceId: String,
        wallet: String,
        amountFormatted: String,
        senderName: String,
        securityCode: String?,
        notifiedBucketEpochTenSeconds: Long
    ): String {
        val canonical = listOf(
            deviceId.trim(),
            wallet.trim().uppercase(),
            amountFormatted.trim(),
            senderName.trim().lowercase(),
            securityCode?.trim().orEmpty(),
            notifiedBucketEpochTenSeconds.toString()
        ).joinToString("|")

        val digest = MessageDigest.getInstance(SHA256_ALGORITHM)
            .digest(canonical.toByteArray(StandardCharsets.UTF_8))
        return bytesToHex(digest)
    }

    private fun bytesToHex(bytes: ByteArray): String {
        val hexChars = CharArray(bytes.size * 2)
        for (i in bytes.indices) {
            val v = bytes[i].toInt() and 0xFF
            hexChars[i * 2] = HEX_ARRAY[v ushr 4]
            hexChars[i * 2 + 1] = HEX_ARRAY[v and 0x0F]
        }
        return String(hexChars)
    }

    private val HEX_ARRAY = "0123456789abcdef".toCharArray()
}
