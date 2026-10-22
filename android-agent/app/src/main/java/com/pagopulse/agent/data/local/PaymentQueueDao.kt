package com.pagopulse.agent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentQueueDao {

    /**
     * Inserts a captured payment notification into the local offline queue.
     * Uses IGNORE conflict strategy on `idempotency_key` so duplicate Android
     * notification broadcasts are silently deduplicated at the SQLite layer.
     *
     * @return rowId, or -1L if the `idempotency_key` already exists.
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun enqueuePayment(entity: PaymentQueueEntity): Long

    @Query(
        """
        SELECT * FROM payment_queue
        WHERE sync_status IN ('PENDING', 'FAILED')
          AND retry_count < :maxRetries
        ORDER BY notified_at_epoch_ms ASC
        LIMIT :batchSize
        """
    )
    suspend fun getPendingBatch(maxRetries: Int = 10, batchSize: Int = 25): List<PaymentQueueEntity>

    @Query(
        """
        UPDATE payment_queue
        SET sync_status = :status,
            last_error = NULL
        WHERE id = :id
        """
    )
    suspend fun markSynced(id: Long, status: SyncStatus = SyncStatus.SYNCED)

    @Query(
        """
        UPDATE payment_queue
        SET sync_status = :status,
            retry_count = retry_count + 1,
            last_error = :errorMessage
        WHERE id = :id
        """
    )
    suspend fun markAttemptFailed(
        id: Long,
        errorMessage: String,
        status: SyncStatus = SyncStatus.FAILED
    )

    @Query("SELECT * FROM payment_queue ORDER BY notified_at_epoch_ms DESC LIMIT :limit")
    fun observeRecentPayments(limit: Int = 50): Flow<List<PaymentQueueEntity>>

    @Query("SELECT COUNT(*) FROM payment_queue WHERE sync_status = 'PENDING'")
    fun observePendingCount(): Flow<Int>
}
