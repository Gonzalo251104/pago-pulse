package com.pagopulse.agent.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pagopulse.agent.core.BatteryHelper
import com.pagopulse.agent.core.CryptoUtils
import com.pagopulse.agent.core.PairingCredentials
import com.pagopulse.agent.data.local.AppDatabase
import com.pagopulse.agent.data.local.PaymentQueueEntity
import com.pagopulse.agent.data.local.SyncStatus
import com.pagopulse.agent.data.remote.PaymentSyncWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant

@Composable
fun AgentStatusScreen(
    credentials: PairingCredentials,
    onUnpairClick: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val dao = remember { AppDatabase.getInstance(context).paymentQueueDao() }

    val recentPayments by dao.observeRecentPayments(limit = 20).collectAsState(initial = emptyList())
    val pendingCount by dao.observePendingCount().collectAsState(initial = 0)

    var notificationAccessGranted by remember {
        mutableStateOf(BatteryHelper.isNotificationListenerEnabled(context))
    }
    var batteryUnrestricted by remember {
        mutableStateOf(BatteryHelper.isIgnoringBatteryOptimizations(context))
    }

    fun sendTestPayment() {
        scope.launch(Dispatchers.IO) {
            val nowMs = System.currentTimeMillis()
            val securityCode = (100..999).random().toString()
            val amount = 45.50
            val sender = "Carlos Mendoza (Prueba)"
            val idempotencyKey = CryptoUtils.computeIdempotencyKey(
                deviceId = credentials.deviceId,
                wallet = "YAPE",
                amountFormatted = "45.50",
                senderName = sender,
                securityCode = securityCode,
                notifiedBucketEpochTenSeconds = nowMs / 1000L
            )

            val entity = PaymentQueueEntity(
                idempotencyKey = idempotencyKey,
                wallet = "YAPE",
                amount = amount,
                senderName = sender,
                securityCode = securityCode,
                rawNotification = "Confirmación de Pago. $sender te envió un pago por S/ 45.50. El código de seguridad es: $securityCode",
                notifiedAtIso = Instant.ofEpochMilli(nowMs).toString(),
                notifiedAtEpochMs = nowMs,
                syncStatus = SyncStatus.PENDING
            )
            dao.enqueuePayment(entity)
            PaymentSyncWorker.enqueueImmediateSync(context)
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp)
        ) {
            Text(
                text = "Agente Activo: ${credentials.deviceName}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Servidor: ${credentials.apiBaseUrl} • En cola: $pendingCount",
                style = MaterialTheme.typography.bodySmall
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Permission Checklist Card
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Lista de Permisos Críticos",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (notificationAccessGranted) {
                                "✅ Acceso a Notificaciones activo"
                            } else {
                                "⚠️ Falta Acceso a Notificaciones"
                            },
                            style = MaterialTheme.typography.bodySmall
                        )
                        if (!notificationAccessGranted) {
                            OutlinedButton(
                                onClick = {
                                    context.startActivity(
                                        BatteryHelper.buildNotificationListenerSettingsIntent()
                                    )
                                    notificationAccessGranted =
                                        BatteryHelper.isNotificationListenerEnabled(context)
                                }
                            ) {
                                Text("Activar")
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (batteryUnrestricted) {
                                "✅ Sin ahorro de batería OEM"
                            } else {
                                "⚠️ Excluir de ahorro de batería"
                            },
                            style = MaterialTheme.typography.bodySmall
                        )
                        if (!batteryUnrestricted) {
                            OutlinedButton(
                                onClick = {
                                    context.startActivity(
                                        BatteryHelper.buildIgnoreBatteryOptimizationsIntent(context)
                                    )
                                    batteryUnrestricted =
                                        BatteryHelper.isIgnoringBatteryOptimizations(context)
                                }
                            ) {
                                Text("Excluir")
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Button(
                    onClick = { sendTestPayment() },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Enviar Pago de Prueba")
                }

                OutlinedButton(
                    onClick = onUnpairClick
                ) {
                    Text("Desvincular")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Últimos pagos en cola local (${recentPayments.size})",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(recentPayments, key = { it.id }) { item ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${item.wallet} • ${item.senderName}",
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Estado: ${item.syncStatus} • Cód: ${item.securityCode ?: "—"}",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                            Text(
                                text = "S/ ${"%.2f".format(item.amount)}",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
