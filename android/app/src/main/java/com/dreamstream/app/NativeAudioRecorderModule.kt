package com.dreamstream.app

import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.concurrent.thread
import kotlin.math.log10
import kotlin.math.sqrt

class NativeAudioRecorderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val audioManager: AudioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingThread: Thread? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    
    private val SAMPLE_RATE = 44100
    private val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    private val BUFFER_SIZE = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT) * 2
    private val METERING_INTERVAL_MS = 100L

    override fun getName(): String = "NativeAudioRecorderModule"

    @ReactMethod
    fun startRecording(useBluetoothSco: Boolean, promise: Promise) {
        if (isRecording) {
            promise.resolve(true)
            return
        }

        try {
            // Choose audio source based on Bluetooth SCO status
            val audioSource = if (useBluetoothSco && audioManager.isBluetoothScoOn) {
                Log.d(TAG, "Using VOICE_COMMUNICATION audio source for Bluetooth SCO")
                MediaRecorder.AudioSource.VOICE_COMMUNICATION
            } else {
                Log.d(TAG, "Using MIC audio source")
                MediaRecorder.AudioSource.MIC
            }

            // Create AudioRecord with the appropriate source
            audioRecord = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioRecord.Builder()
                    .setAudioSource(audioSource)
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AUDIO_FORMAT)
                            .setSampleRate(SAMPLE_RATE)
                            .setChannelMask(CHANNEL_CONFIG)
                            .build()
                    )
                    .setBufferSizeInBytes(BUFFER_SIZE)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                AudioRecord(audioSource, SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT, BUFFER_SIZE)
            }

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord failed to initialize")
                promise.reject("AUDIO_ERROR", "Failed to initialize audio recorder")
                return
            }

            audioRecord?.startRecording()
            isRecording = true

            // Start processing thread
            recordingThread = thread(start = true) {
                processAudio()
            }

            promise.resolve(true)
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied for audio recording", e)
            promise.reject("PERMISSION_ERROR", "Microphone permission not granted", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recording", e)
            promise.reject("AUDIO_ERROR", "Failed to start audio recording", e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        if (!isRecording) {
            promise.resolve(true)
            return
        }

        try {
            isRecording = false
            
            recordingThread?.interrupt()
            recordingThread?.join(1000)
            recordingThread = null

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop recording", e)
            promise.reject("AUDIO_ERROR", "Failed to stop audio recording", e)
        }
    }

    @ReactMethod
    fun isRecording(promise: Promise) {
        promise.resolve(isRecording)
    }

    private fun processAudio() {
        val buffer = ShortArray(BUFFER_SIZE / 2)
        var lastMeteringTime = System.currentTimeMillis()

        while (isRecording && !Thread.currentThread().isInterrupted) {
            try {
                val readResult = audioRecord?.read(buffer, 0, buffer.size) ?: -1
                
                if (readResult > 0) {
                    val currentTime = System.currentTimeMillis()
                    
                    if (currentTime - lastMeteringTime >= METERING_INTERVAL_MS) {
                        val rms = calculateRms(buffer, readResult)
                        val dbfs = rmsToDbfs(rms)
                        val normalizedRms = dbfsToNormalized(dbfs)
                        
                        mainHandler.post {
                            sendAudioLevelEvent(normalizedRms, dbfs)
                        }
                        
                        lastMeteringTime = currentTime
                    }
                }
            } catch (e: Exception) {
                if (isRecording) {
                    Log.e(TAG, "Error processing audio", e)
                }
            }
        }
    }

    private fun calculateRms(buffer: ShortArray, length: Int): Float {
        var sum = 0.0
        for (i in 0 until length) {
            val sample = buffer[i] / 32768.0  // Normalize to -1.0 to 1.0
            sum += sample * sample
        }
        return sqrt(sum / length).toFloat()
    }

    private fun rmsToDbfs(rms: Float): Float {
        if (rms <= 0) return -96f
        return (20 * log10(rms.toDouble())).toFloat().coerceIn(-96f, 0f)
    }

    private fun dbfsToNormalized(dbfs: Float): Float {
        val minDb = -60f
        val maxDb = 0f
        return ((dbfs - minDb) / (maxDb - minDb)).coerceIn(0f, 1f)
    }

    private fun sendAudioLevelEvent(rms: Float, dbfs: Float) {
        val params = Arguments.createMap().apply {
            putDouble("rms", rms.toDouble())
            putDouble("dbfs", dbfs.toDouble())
        }
        
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("NativeAudioLevel", params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    companion object {
        private const val TAG = "NativeAudioRecorder"
    }
}
