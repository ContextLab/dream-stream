package com.dreamstream.app

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class BluetoothAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var bluetoothHeadset: BluetoothHeadset? = null
    private var bluetoothA2dp: BluetoothA2dp? = null
    private var isScoStarted = false
    private var scoReceiver: BroadcastReceiver? = null

    override fun getName(): String = "BluetoothAudioModule"

    private val headsetProfileListener = object : BluetoothProfile.ServiceListener {
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

    private val a2dpProfileListener = object : BluetoothProfile.ServiceListener {
        override fun onServiceConnected(profile: Int, proxy: BluetoothProfile) {
            if (profile == BluetoothProfile.A2DP) {
                bluetoothA2dp = proxy as BluetoothA2dp
            }
        }

        override fun onServiceDisconnected(profile: Int) {
            if (profile == BluetoothProfile.A2DP) {
                bluetoothA2dp = null
            }
        }
    }

    init {
        if (hasBluetoothPermission()) {
            bluetoothAdapter?.getProfileProxy(reactContext, headsetProfileListener, BluetoothProfile.HEADSET)
            bluetoothAdapter?.getProfileProxy(reactContext, a2dpProfileListener, BluetoothProfile.A2DP)
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
                for (device in devices) {
                    if (device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                        device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                        device.type == AudioDeviceInfo.TYPE_BLE_HEADSET) {
                        promise.resolve(true)
                        return
                    }
                }
            }

            if (!hasBluetoothPermission()) {
                promise.resolve(false)
                return
            }

            val headsetConnected = bluetoothHeadset?.connectedDevices?.isNotEmpty() == true
            val a2dpConnected = bluetoothA2dp?.connectedDevices?.isNotEmpty() == true
            
            promise.resolve(headsetConnected || a2dpConnected)
        } catch (e: SecurityException) {
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("BT_ERROR", "Failed to check headset connection", e)
        }
    }

    @ReactMethod
    fun getConnectedBluetoothDevice(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val devices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
                for (device in devices) {
                    if (device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                        device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                        device.type == AudioDeviceInfo.TYPE_BLE_HEADSET) {
                        val result: WritableMap = Arguments.createMap()
                        result.putString("name", device.productName?.toString() ?: "Bluetooth Device")
                        result.putString("address", device.id.toString())
                        result.putString("type", when(device.type) {
                            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "SCO"
                            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "A2DP"
                            AudioDeviceInfo.TYPE_BLE_HEADSET -> "BLE"
                            else -> "Unknown"
                        })
                        promise.resolve(result)
                        return
                    }
                }
            }

            if (!hasBluetoothPermission()) {
                promise.resolve(null)
                return
            }

            var device: BluetoothDevice? = null
            device = bluetoothHeadset?.connectedDevices?.firstOrNull()
            if (device == null) {
                device = bluetoothA2dp?.connectedDevices?.firstOrNull()
            }

            if (device == null) {
                promise.resolve(null)
                return
            }

            val result: WritableMap = Arguments.createMap()
            result.putString("name", device.name ?: "Unknown")
            result.putString("address", device.address)
            result.putString("type", "Classic")
            promise.resolve(result)
        } catch (e: SecurityException) {
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("BT_ERROR", "Failed to get connected device", e)
        }
    }

    @ReactMethod
    fun getAudioDevices(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val inputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
                val result: WritableArray = Arguments.createArray()
                
                for (device in inputDevices) {
                    val deviceInfo: WritableMap = Arguments.createMap()
                    deviceInfo.putInt("id", device.id)
                    deviceInfo.putString("name", device.productName?.toString() ?: "Unknown")
                    deviceInfo.putInt("type", device.type)
                    deviceInfo.putString("typeName", getDeviceTypeName(device.type))
                    deviceInfo.putBoolean("isSource", device.isSource)
                    result.pushMap(deviceInfo)
                }
                
                promise.resolve(result)
            } else {
                promise.resolve(Arguments.createArray())
            }
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", "Failed to get audio devices", e)
        }
    }

    private fun getDeviceTypeName(type: Int): String {
        return when (type) {
            AudioDeviceInfo.TYPE_BUILTIN_MIC -> "Built-in Mic"
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth SCO"
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Bluetooth A2DP"
            AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired Headset"
            AudioDeviceInfo.TYPE_USB_HEADSET -> "USB Headset"
            AudioDeviceInfo.TYPE_BLE_HEADSET -> "BLE Headset"
            else -> "Unknown ($type)"
        }
    }

    private var scoConnectionPromise: Promise? = null
    private var scoConnectionTimeoutHandler: android.os.Handler? = null
    private var scoConnectionTimeoutRunnable: Runnable? = null

    @ReactMethod
    fun startBluetoothSco(promise: Promise) {
        try {
            if (isScoStarted && audioManager.isBluetoothScoOn) {
                promise.resolve(true)
                return
            }

            if (!audioManager.isBluetoothScoAvailableOffCall) {
                promise.resolve(false)
                return
            }

            scoConnectionPromise = promise
            registerScoReceiverWithCallback()

            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            audioManager.startBluetoothSco()
            isScoStarted = true

            scoConnectionTimeoutHandler = android.os.Handler(android.os.Looper.getMainLooper())
            scoConnectionTimeoutRunnable = Runnable {
                scoConnectionPromise?.let {
                    audioManager.isBluetoothScoOn = true
                    it.resolve(true)
                    scoConnectionPromise = null
                }
            }
            scoConnectionTimeoutHandler?.postDelayed(scoConnectionTimeoutRunnable!!, 3000)

        } catch (e: Exception) {
            scoConnectionPromise = null
            promise.reject("SCO_ERROR", "Failed to start Bluetooth SCO", e)
        }
    }

    private fun registerScoReceiverWithCallback() {
        unregisterScoReceiver()
        
        scoReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1)
                val params: WritableMap = Arguments.createMap()

                when (state) {
                    AudioManager.SCO_AUDIO_STATE_CONNECTED -> {
                        params.putString("state", "connected")
                        audioManager.isBluetoothScoOn = true
                        
                        scoConnectionTimeoutHandler?.removeCallbacks(scoConnectionTimeoutRunnable!!)
                        scoConnectionPromise?.resolve(true)
                        scoConnectionPromise = null
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
