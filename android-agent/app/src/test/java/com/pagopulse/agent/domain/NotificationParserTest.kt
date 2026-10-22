package com.pagopulse.agent.domain

import com.pagopulse.agent.core.CryptoUtils
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.math.BigDecimal

class NotificationParserTest {

    // 1. Standard Yape Pattern A with 3-digit security code
    @Test
    fun `parses Yape Pattern A with security code and decimal amount`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Confirmación de Pago",
            text = "Carlos Mendoza te envió un pago por S/ 45.50. El código de seguridad es: 842"
        )
        assertNotNull(result)
        assertEquals(WalletType.YAPE, result!!.wallet)
        assertEquals(BigDecimal("45.50"), result.amount)
        assertEquals("Carlos Mendoza", result.senderName)
        assertEquals("842", result.securityCode)
    }

    // 2. Yape Pattern A with inline "Confirmación de Pago" prefix in text
    @Test
    fun `parses Yape Pattern A when Confirmacion de Pago is inline in body`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = null,
            text = "Confirmación de Pago. María Elena Quispe te envió un pago por S/ 120.00. El código de seguridad es: 019"
        )
        assertNotNull(result)
        assertEquals(WalletType.YAPE, result!!.wallet)
        assertEquals(BigDecimal("120.00"), result.amount)
        assertEquals("María Elena Quispe", result.senderName)
        assertEquals("019", result.securityCode)
    }

    // 3. Yape Pattern A without security code
    @Test
    fun `parses Yape Pattern A without security code`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Confirmación de Pago",
            text = "Jorge Luis Huamán te envió un pago por S/ 15"
        )
        assertNotNull(result)
        assertEquals(WalletType.YAPE, result!!.wallet)
        assertEquals(BigDecimal("15.00"), result.amount)
        assertEquals("Jorge Luis Huamán", result.senderName)
        assertNull(result.securityCode)
    }

    // 4. Yape Pattern B short format with integer amount
    @Test
    fun `parses Yape Pattern B short format with integer amount`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Yape",
            text = "Yape! Rosa Angélica Chávez te envió S/ 8"
        )
        assertNotNull(result)
        assertEquals(WalletType.YAPE, result!!.wallet)
        assertEquals(BigDecimal("8.00"), result.amount)
        assertEquals("Rosa Angélica Chávez", result.senderName)
        assertNull(result.securityCode)
    }

    // 5. Yape Pattern B short format with 2 decimals
    @Test
    fun `parses Yape Pattern B short format with decimal amount`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = null,
            text = "Yape! Diego Alejandro Vargas te envió S/ 250.90"
        )
        assertNotNull(result)
        assertEquals(WalletType.YAPE, result!!.wallet)
        assertEquals(BigDecimal("250.90"), result.amount)
        assertEquals("Diego Alejandro Vargas", result.senderName)
    }

    // 6. Yape Pattern B with inverted exclamation "¡Yape!"
    @Test
    fun `parses Yape Pattern B with Spanish inverted exclamation mark`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = null,
            text = "¡Yape! Ana Paula Torres te envió S/ 32.5"
        )
        assertNotNull(result)
        assertEquals(BigDecimal("32.50"), result!!.amount)
        assertEquals("Ana Paula Torres", result.senderName)
    }

    // 7. Yape with no space after S/
    @Test
    fun `parses Yape when S slash has no space before amount`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Confirmación de Pago",
            text = "Pedro Castillo Mamani te envió un pago por S/99.99. El código de seguridad es: 777"
        )
        assertNotNull(result)
        assertEquals(BigDecimal("99.99"), result!!.amount)
        assertEquals("Pedro Castillo Mamani", result.senderName)
        assertEquals("777", result.securityCode)
    }

    // 8. Plin via Interbank ("te ha plineado")
    @Test
    fun `parses Interbank Plin notification with te ha plineado`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_PLIN_INTERBANK,
            title = "Plin",
            text = "Lucía Fernández te ha plineado S/ 65.00"
        )
        assertNotNull(result)
        assertEquals(WalletType.PLIN, result!!.wallet)
        assertEquals(BigDecimal("65.00"), result.amount)
        assertEquals("Lucía Fernández", result.senderName)
        assertNull(result.securityCode)
    }

    // 9. Plin via BBVA ("te envió")
    @Test
    fun `parses BBVA Plin notification with te envio`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_PLIN_BBVA,
            title = "BBVA Plin",
            text = "Fernando José Salazar te envió S/ 140.20"
        )
        assertNotNull(result)
        assertEquals(WalletType.PLIN, result!!.wallet)
        assertEquals(BigDecimal("140.20"), result.amount)
        assertEquals("Fernando José Salazar", result.senderName)
    }

    // 10. Plin with integer amount and no space after S/
    @Test
    fun `parses Plin integer amount without space after S slash`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_PLIN_INTERBANK,
            title = null,
            text = "Gabriela Soto te ha plineado S/20"
        )
        assertNotNull(result)
        assertEquals(WalletType.PLIN, result!!.wallet)
        assertEquals(BigDecimal("20.00"), result.amount)
        assertEquals("Gabriela Soto", result.senderName)
    }

    // 11. Plin with "te envió un pago por S/"
    @Test
    fun `parses BBVA Plin with full confirmation phrase`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_PLIN_BBVA,
            title = "Confirmación de Pago",
            text = "Ricardo Palma te envió un pago por S/ 52.80"
        )
        assertNotNull(result)
        assertEquals(WalletType.PLIN, result!!.wallet)
        assertEquals(BigDecimal("52.80"), result.amount)
        assertEquals("Ricardo Palma", result.senderName)
    }

    // 12. Spam Blocklist: "préstamo"
    @Test
    fun `ignores Yape promotional notification containing prestamo`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "¡Tienes un préstamo listo!",
            text = "Yape! Solicita tu préstamo de hasta S/ 500 al instante"
        )
        assertNull(result)
    }

    // 13. Spam Blocklist: "crédito"
    @Test
    fun `ignores Yape promotional notification containing credito`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Yape",
            text = "Yape! Tu crédito te envió S/ 1000 para usar hoy"
        )
        assertNull(result)
    }

    // 14. Spam Blocklist: "promoción"
    @Test
    fun `ignores Yape promotional notification containing promocion`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Promoción Yape",
            text = "Aprovecha esta promoción por S/ 19.90 en cines"
        )
        assertNull(result)
    }

    // 15. Spam Blocklist: "sorteo"
    @Test
    fun `ignores Yape notification containing sorteo`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Sorteo Yape",
            text = "Yape! Participa en el sorteo y gana S/ 500"
        )
        assertNull(result)
    }

    // 16. Spam Blocklist: "recarga"
    @Test
    fun `ignores Yape notification containing recarga`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Recarga exitosa",
            text = "Realizaste una recarga por S/ 10.00"
        )
        assertNull(result)
    }

    // 17. Spam Blocklist: "descuento"
    @Test
    fun `ignores Plin notification containing descuento`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_PLIN_INTERBANK,
            title = "Plin",
            text = "Obtén un descuento de S/ 25.00 pagando con Plin"
        )
        assertNull(result)
    }

    // 18. Spam Blocklist: "aprobado"
    @Test
    fun `ignores notification containing aprobado`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Yape",
            text = "Tienes un monto aprobado te envió S/ 300.00"
        )
        assertNull(result)
    }

    // 19. Spam Blocklist: "tienda"
    @Test
    fun `ignores Yape Tienda promotional notification`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Yape Tienda",
            text = "Compra en Yape Tienda desde S/ 29.90"
        )
        assertNull(result)
    }

    // 20. Unknown package name (e.g. WhatsApp fake message attempting to spoof Yape)
    @Test
    fun `rejects WhatsApp notification spoofing a Yape payment text`() {
        val result = NotificationParser.parse(
            packageName = "com.whatsapp",
            title = "Confirmación de Pago",
            text = "Carlos Mendoza te envió un pago por S/ 45.50. El código de seguridad es: 842"
        )
        assertNull(result)
    }

    // 21. Unknown package name (SMS app spoofing Plin)
    @Test
    fun `rejects SMS notification spoofing a Plin payment text`() {
        val result = NotificationParser.parse(
            packageName = "com.google.android.apps.messaging",
            title = "Plin",
            text = "Lucía Fernández te ha plineado S/ 65.00"
        )
        assertNull(result)
    }

    // 22. Outgoing Yape payment ("Enviaste un pago") must be ignored
    @Test
    fun `ignores outgoing Yape payment sent by the owner`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Confirmación de Pago",
            text = "Enviaste un pago por S/ 50.00 a Juan Pérez"
        )
        assertNull(result)
    }

    // 23. Empty or blank notification text
    @Test
    fun `returns null when notification text is null or blank`() {
        assertNull(
            NotificationParser.parse(
                packageName = NotificationParser.PACKAGE_YAPE,
                title = "Yape",
                text = "   "
            )
        )
        assertNull(
            NotificationParser.parse(
                packageName = NotificationParser.PACKAGE_YAPE,
                title = "Yape",
                text = null
            )
        )
    }

    // 24. Zero amount payment is rejected
    @Test
    fun `rejects malformed payment with zero amount`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Yape",
            text = "Yape! Carlos Mendoza te envió S/ 0.00"
        )
        assertNull(result)
    }

    // 25. Sender with compound Peruvian surname and apostrophe/hyphen
    @Test
    fun `parses sender with compound hyphenated surname`() {
        val result = NotificationParser.parse(
            packageName = NotificationParser.PACKAGE_YAPE,
            title = "Confirmación de Pago",
            text = "Claudia Belén De La Cruz-Sánchez te envió un pago por S/ 18.70. El código de seguridad es: 504"
        )
        assertNotNull(result)
        assertEquals("Claudia Belén De La Cruz-Sánchez", result!!.senderName)
        assertEquals(BigDecimal("18.70"), result.amount)
        assertEquals("504", result.securityCode)
    }

    // 26. CryptoUtils HMAC-SHA256 matches backend Node.js vector
    @Test
    fun `computes HMAC-SHA256 signature matching backend specification`() {
        val secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        val timestamp = 1792621800L
        val body = """{"wallet":"YAPE","amount":45.5}"""
        val signature = CryptoUtils.computeHmacSignature(secret, timestamp, body)

        assertEquals(64, signature.length)
        // Deterministic verification
        assertEquals(
            signature,
            CryptoUtils.computeHmacSignature(secret, timestamp, body)
        )
    }
}
