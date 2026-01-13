package com.dreamstream.app

import android.app.Activity
import android.os.Build
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class ImmersiveModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ImmersiveModeModule"

    @ReactMethod
    fun enableImmersiveMode(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = getCurrentActivity() ?: run {
                    promise.reject("NO_ACTIVITY", "No current activity")
                    return@runOnUiThread
                }

                val window = activity.window
                
                window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    window.attributes.layoutInDisplayCutoutMode = 
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val controller = window.insetsController
                    controller?.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    controller?.systemBarsBehavior = 
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                } else {
                    @Suppress("DEPRECATION")
                    window.decorView.systemUiVisibility = (
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        or View.SYSTEM_UI_FLAG_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    )
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("IMMERSIVE_ERROR", "Failed to enable immersive mode", e)
            }
        }
    }

    @ReactMethod
    fun disableImmersiveMode(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = getCurrentActivity() ?: run {
                    promise.reject("NO_ACTIVITY", "No current activity")
                    return@runOnUiThread
                }

                val window = activity.window
                
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val controller = window.insetsController
                    controller?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                } else {
                    @Suppress("DEPRECATION")
                    window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("IMMERSIVE_ERROR", "Failed to disable immersive mode", e)
            }
        }
    }

    @ReactMethod
    fun preventScreenSaver(enable: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = getCurrentActivity() ?: run {
                    promise.reject("NO_ACTIVITY", "No current activity")
                    return@runOnUiThread
                }

                val window = activity.window
                
                if (enable) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
                    window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
                    window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    window.clearFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
                    window.clearFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
                }

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SCREEN_ERROR", "Failed to set screen saver prevention", e)
            }
        }
    }

    @ReactMethod
    fun setScreenBrightness(brightness: Float, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val activity = getCurrentActivity() ?: run {
                    promise.reject("NO_ACTIVITY", "No current activity")
                    return@runOnUiThread
                }

                val window = activity.window
                val layoutParams = window.attributes
                layoutParams.screenBrightness = brightness.coerceIn(0f, 1f)
                window.attributes = layoutParams

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("BRIGHTNESS_ERROR", "Failed to set brightness", e)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }
}
