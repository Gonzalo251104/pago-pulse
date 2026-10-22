package com.pagopulse.agent.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.text.Normalizer

/**
 * Pure Kotlin notification parser for Peruvian mobile wallets (Yape and Plin).
 * Zero Android framework dependencies so it runs in fast JVM unit tests.
 */
object NotificationParser {

    const val PACKAGE_YAPE = "com.bcp.innovacxion.yapeapp"
    const val PACKAGE_PLIN_INTERBANK = "pe.com.interbank.mpay"
    const val PACKAGE_PLIN_BBVA = "com.bbva.nxt_peru"

    private val PACKAGE_TO_WALLET = mapOf(
        PACKAGE_YAPE to WalletType.YAPE,
        PACKAGE_PLIN_INTERBANK to WalletType.PLIN,
        PACKAGE_PLIN_BBVA to WalletType.PLIN
    )

    private val SPAM_BLOCKLIST_NORMALIZED = listOf(
        "prestamo",
        "credito",
        "promocion",
        "sorteo",
        "recarga",
        "descuento",
        "aprobado",
        "tienda"
    )

    // Yape Pattern A: "(Confirmación de Pago.)? <Sender> te envió un pago por S/ <Amount> ... (código de seguridad es: <3 digits>)?"
    private val YAPE_PATTERN_A = Regex(
        pattern = """(?is)^(?:Confirmaci[oó]n de Pago[\s.:!\-]*)?(.+?)\s+te envi[oó] un pago por S/\s*([0-9]+(?:\.[0-9]{1,2})?)(?:.*?(?:c[oó]digo de seguridad es:\s*([0-9]{3})))?.*$"""
    )

    // Yape Pattern B: "Yape! <Sender> te envió S/ <Amount>" (with optional security code tail)
    private val YAPE_PATTERN_B = Regex(
        pattern = """(?is)^[¡!]?Yape[¡!]?\s*(.+?)\s+te envi[oó]\s+S/\s*([0-9]+(?:\.[0-9]{1,2})?)(?:.*?(?:c[oó]digo de seguridad es:\s*([0-9]{3})))?.*$"""
    )

    // Plin Pattern: "(Plin!)? <Sender> te (ha plineado|envió) S/ <Amount>"
    private val PLIN_PATTERN = Regex(
        pattern = """(?is)^(?:[¡!]?Plin[¡!:\s\-]*)?(?:Confirmaci[oó]n de Pago[\s.:!\-]*)?(.+?)\s+te (?:ha plineado|pline[oó]|envi[oó])\s+(?:un pago por\s+)?S/\s*([0-9]+(?:\.[0-9]{1,2})?).*$"""
    )

    fun resolveWallet(packageName: String): WalletType? {
        return PACKAGE_TO_WALLET[packageName.trim()]
    }

    fun isPromotionalSpam(text: String): Boolean {
        val normalized = normalizeAccents(text).lowercase()
        return SPAM_BLOCKLIST_NORMALIZED.any { blockedWord ->
            normalized.contains(blockedWord)
        }
    }

    /**
     * Parses a notification from its source Android `packageName`, optional `title`, and `text`.
     * Returns `null` if the package is not an allowed wallet app, if the text contains promotional
     * spam keywords, or if it does not match a genuine incoming payment pattern.
     */
    fun parse(
        packageName: String,
        title: String?,
        text: String?
    ): ParsedPayment? {
        val wallet = resolveWallet(packageName) ?: return null

        val cleanTitle = title?.trim().orEmpty()
        val cleanText = text?.trim().orEmpty()
        if (cleanText.isEmpty()) return null

        val combinedRaw = if (
            cleanTitle.isNotEmpty() &&
            !cleanText.startsWith(cleanTitle, ignoreCase = true)
        ) {
            "$cleanTitle. $cleanText"
        } else {
            cleanText
        }

        if (isPromotionalSpam(combinedRaw)) {
            return null
        }

        return when (wallet) {
            WalletType.YAPE -> parseYape(cleanText, combinedRaw)
            WalletType.PLIN -> parsePlin(cleanText, combinedRaw)
        }
    }

    private fun parseYape(bodyText: String, combinedRaw: String): ParsedPayment? {
        val candidates = listOf(bodyText, combinedRaw)

        for (candidate in candidates) {
            val matchB = YAPE_PATTERN_B.matchEntire(candidate.trim())
            if (matchB != null) {
                return buildParsedPayment(
                    wallet = WalletType.YAPE,
                    rawSender = matchB.groupValues[1],
                    rawAmount = matchB.groupValues[2],
                    rawSecurityCode = matchB.groupValues.getOrNull(3),
                    rawNotification = combinedRaw
                )
            }

            val matchA = YAPE_PATTERN_A.matchEntire(candidate.trim())
            if (matchA != null) {
                return buildParsedPayment(
                    wallet = WalletType.YAPE,
                    rawSender = matchA.groupValues[1],
                    rawAmount = matchA.groupValues[2],
                    rawSecurityCode = matchA.groupValues.getOrNull(3),
                    rawNotification = combinedRaw
                )
            }
        }

        return null
    }

    private fun parsePlin(bodyText: String, combinedRaw: String): ParsedPayment? {
        val candidates = listOf(bodyText, combinedRaw)

        for (candidate in candidates) {
            val match = PLIN_PATTERN.matchEntire(candidate.trim())
            if (match != null) {
                return buildParsedPayment(
                    wallet = WalletType.PLIN,
                    rawSender = match.groupValues[1],
                    rawAmount = match.groupValues[2],
                    rawSecurityCode = null,
                    rawNotification = combinedRaw
                )
            }
        }

        return null
    }

    private fun buildParsedPayment(
        wallet: WalletType,
        rawSender: String,
        rawAmount: String,
        rawSecurityCode: String?,
        rawNotification: String
    ): ParsedPayment? {
        val cleanedSender = rawSender
            .replace(Regex("""^(?:Confirmaci[oó]n de Pago|[¡!]?Yape[¡!]?|[¡!]?Plin[¡!]?)[\s.:!\-]*""", RegexOption.IGNORE_CASE), "")
            .trim()

        if (cleanedSender.isEmpty()) return null

        val parsedAmount = rawAmount.toBigDecimalOrNull()
            ?.setScale(2, RoundingMode.HALF_UP)
            ?: return null

        if (parsedAmount <= BigDecimal.ZERO) return null

        val securityCode = rawSecurityCode?.trim()?.takeIf { it.matches(Regex("""^\d{3}$""")) }

        return ParsedPayment(
            wallet = wallet,
            amount = parsedAmount,
            senderName = cleanedSender,
            securityCode = securityCode,
            rawNotification = rawNotification
        )
    }

    private fun normalizeAccents(input: String): String {
        val normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
        return normalized.replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
    }
}
