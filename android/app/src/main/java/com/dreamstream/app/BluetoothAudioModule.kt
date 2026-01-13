package com.dreamstream.app

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class BluetoothAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothHeadset: BluetoothHeadset? = null
    private var isScoStarted = false
    private var scoReceiver: BroadcastReceiver? = null

    override fun getName(): String = "BluetoothAudioModule"

    private val profileListener = object : BluetoothProfile.ServiceListener {
        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
            if (profile == BluetoothProfile.HEADSET) {
                bluetoothHeadset = proxy as BluetoothHeadset
            }
        }

        override fun onServiceDisconnected(profile: Int) {
            if (profile == BluetoothProfile.HEADSET) {
                bluetoothHeadset = null
            }
        }
    }

    init {
        if (hasBluetoothPermission()) {
            bluetoothAdapter?.getProfileProxy(reactContext, profileListener, BluetoothProfile.HEADSET)
        }
    }

    private fun hasBluetoothPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                reactApplicationContext,
                android.Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    @ReactMethod
    fun isBluetoothAvailable(promise: Promise) {
        try {
            val available = bluetoothAdapter != null && bluetoothAdapter!!.isEnabled
            promise.resolve(available)
        } catch (e: Exception) {
            promise.reject("BT_ERROR", "Failed to check Bluetooth availability", e)
        }
    }

    @ReactMethod
    fun isBluetoothHeadsetConnected(promise: Promise) {
        try {
            if (!hasBluetoothPermission()) {
                promise.resolve(false)
                return
            }

            val headset = bluetoothHeadset
            if (headset == null) {
                promise.resolve(false)
                return
            }

            val connectedDevices = headset.connectedDevices
            promise.resolve(connectedDevices.isNotEmpty())
        } catch (e: SecurityException) {
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("BT_ERROR", "Failed to check headset connection", e)
        }
    }

    @ReactMethod
    fun getConnectedBluetoothDevice(promise: Promise) {
        try {
            if (!hasBluetoothPermission()) {
                promise.resolve(null)
                return
            }

            val headset = bluetoothHeadset
            if (headset == null) {
                promise.resolve(null)
                return
            }

            val connectedDevices = headset.connectedDevices
            if (connectedDevices.isEmpty()) {
                promise.resolve(null)
                return
            }

            val device = connectedDevices[0]
            val result: WritableMap = Arguments.createMap()
            result.putString("name", device.name ?: "Unknown")
            result.putString("address", device.address)
            promise.resolve(result)
        } catch (e: SecurityException) {
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("BT_ERROR", "Failed to get connected device", e)
        }
    }

    @ReactMethod
    fun startBluetoothSco(promise: Promise) {
        try {
            if (isScoStarted) {
                promise.resolve(true)
                return
            }

            if (!audioManager.isBluetoothScoAvailableOffCall) {
                promise.resolve(false)
                return
            }

            registerScoReceiver()

            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            audioManager.startBluetoothSco()
            audioManager.isBluetoothScoOn = true
            isScoStarted = true

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SCO_ERROR", "Failed to start Bluetooth SCO", e)
        }
    }

    @ReactMethod
    fun stopBluetoothSco(promise: Promise) {
        try {
            if (!isScoStarted) {
                promise.resolve(true)
                return
            }

            unregisterScoReceiver()

            audioManager.isBluetoothScoOn = false
            audioManager.stopBluetoothSco()
            audioManager.mode = AudioManager.MODE_NORMAL
            isScoStarted = false

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SCO_ERROR", "Failed to stop Bluetooth SCO", e)
        }
    }

    @ReactMethod
    fun isScoConnected(promise: Promise) {
        try {
            promise.resolve(audioManager.isBluetoothScoOn)
        } catch (e: Exception) {
            promise.reject("SCO_ERROR", "Failed to check SCO status", e)
        }
    }

    @ReactMethod
    fun getAudioInputSource(promise: Promise) {
        try {
            val result: WritableMap = Arguments.createMap()
            result.putBoolean("isBluetoothScoOn", audioManager.isBluetoothScoOn)
            result.putBoolean("isSpeakerphoneOn", audioManager.isSpeakerphoneOn)
            result.putBoolean("isWiredHeadsetOn", audioManager.isWiredHeadsetOn)
            result.putInt("mode", audioManager.mode)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", "Failed to get audio input source", e)
        }
    }

    private fun registerScoReceiver() {
        if (scoReceiver != null) return

        scoReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1)
                val params: WritableMap = Arguments.createMap()

                when (state) {
                    AudioManager.SCO_AUDIO_STATE_CONNECTED -> {
                        params.putString("state", "connected")
                    }
                    AudioManager.SCO_AUDIO_STATE_DISCONNECTED -> {
                        params.putString("state", "disconnected")
                    }
                    AudioManager.SCO_AUDIO_STATE_CONNECTING -> {
                        params.putString("state", "connecting")
                    }
                    else -> {
                        params.putString("state", "unknown")
                    }
                }

                sendEvent("BluetoothScoStateChange", params)
            }
        }

        val filter = IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
        reactApplicationContext.registerReceiver(scoReceiver, filter)
    }

    private fun unregisterScoReceiver() {
        scoReceiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
            }
            scoReceiver = null
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }
}
