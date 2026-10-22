package com.pagopulse.agent.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.pagopulse.agent.core.DevicePrefs

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val devicePrefs = DevicePrefs(this)

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                var credentials by remember {
                    mutableStateOf(devicePrefs.getPairingCredentials())
                }

                if (credentials == null) {
                    QrPairingScreen(
                        devicePrefs = devicePrefs,
                        onPairedSuccess = { paired ->
                            credentials = paired
                        }
                    )
                } else {
                    AgentStatusScreen(
                        credentials = credentials!!,
                        onUnpairClick = {
                            devicePrefs.clearPairing()
                            credentials = null
                        }
                    )
                }
            }
        }
    }
}
