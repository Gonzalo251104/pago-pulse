package com.pagopulse.agent.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

enum class SyncStatus {
    PENDING,
    SYNCED,
    FAILED
}

@Entity(
    tableName = "payment_queue",
    indices = [
        Index(value = ["idempotency_key"], unique = true),
        Index(value = ["sync_status", "notified_at_epoch_ms"])
    ]
)
data class PaymentQueueEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "idempotency_key")
    val idempotencyKey: String,

    @ColumnInfo(name = "wallet")
    val wallet: String,

    @ColumnInfo(name = "amount")
    val amount: Double,

    @ColumnInfo(name = "sender_name")
    val senderName: String,

    @ColumnInfo(name = "security_code")
    val securityCode: String?,

    @ColumnInfo(name = "raw_notification")
    val rawNotification: String,

    @ColumnInfo(name = "notified_at_iso")
    val notifiedAtIso: String,

    @ColumnInfo(name = "notified_at_epoch_ms")
    val notifiedAtEpochMs: Long,

    @ColumnInfo(name = "sync_status")
    val syncStatus: SyncStatus = SyncStatus.PENDING,

    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0,

    @ColumnInfo(name = "last_error")
    val lastError: String? = null
)
