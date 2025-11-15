package com.aheadai

import android.os.Bundle
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import org.devio.rn.splashscreen.SplashScreen

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "aheadai"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        SplashScreen.show(this)

        // ✅ Fix splash freeze on OnePlus / OPPO / Vivo:
        super.onCreate(null)

        // ✅ Enable real edge-to-edge layout (Fixes clipping in gesture navigation):
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }
}
