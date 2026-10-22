package com.pagopulse.agent.domain

import java.math.BigDecimal

data class ParsedPayment(
    val wallet: WalletType,
    val amount: BigDecimal,
    val senderName: String,
    val securityCode: String?,
    val rawNotification: String
)
