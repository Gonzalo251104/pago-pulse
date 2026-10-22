package com.pagopulse.agent.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.pagopulse.agent.core.DevicePrefs
import com.pagopulse.agent.core.PairingCredentials

@Composable
fun QrPairingScreen(
    devicePrefs: DevicePrefs,
    onPairedSuccess: (PairingCredentials) -> Unit
) {
    val context = LocalContext.current
    var manualJsonInput by remember { mutableStateOf("") }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    fun handleQrRawValue(rawJson: String) {
        devicePrefs.saveFromQrJson(rawJson)
            .onSuccess { credentials ->
                statusMessage = "Vinculado exitosamente: ${credentials.deviceName}"
                onPairedSuccess(credentials)
            }
            .onFailure { error ->
                statusMessage = "Error en formato QR: ${error.message}"
            }
    }

    fun launchCameraQrScanner() {
        val options = GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .enableAutoZoom()
            .build()

        val scanner = GmsBarcodeScanning.getClient(context, options)
        scanner.startScan()
            .addOnSuccessListener { barcode ->
                val rawValue = barcode.rawValue
                if (!rawValue.isNullOrBlank()) {
                    handleQrRawValue(rawValue)
                }
            }
            .addOnFailureListener { e ->
                statusMessage = "No se pudo abrir el escáner: ${e.localizedMessage}"
            }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "PagoPulse Agent",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Escanea el código QR desde la pestaña 'Teléfonos' del panel web de tu negocio para activar la verificación con firma HMAC-SHA256.",
                style = MaterialTheme.typography.bodyMedium
            )

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = { launchCameraQrScanner() },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Escanear Código QR con Cámara")
            }

            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = manualJsonInput,
                onValueChange = { manualJsonInput = it },
                label = { Text("O pega aquí el JSON de emparejamiento") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedButton(
                onClick = { handleQrRawValue(manualJsonInput) },
                enabled = manualJsonInput.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Vincular con JSON")
            }

            if (statusMessage != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = statusMessage!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
