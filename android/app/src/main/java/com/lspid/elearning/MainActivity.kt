package com.lspid.elearning

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * Whole app is one WebView pointed at [BuildConfig.APP_BASE_URL]. The site already is the
 * product; a native shell just needs to host it, hand off downloads the WebView can't render,
 * and stay out of the way on weak hardware/networks.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        val progressBar = ProgressBar(this).apply { isIndeterminate = true }

        setContentView(FrameLayout(this).apply {
            addView(webView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            addView(progressBar, FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.CENTER))
        })

        with(webView.settings) {
            javaScriptEnabled = true // the site's own assets/motion.js and assets/a11y.js need it
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT // reuse the HTTP cache instead of refetching every open
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
        }
        webView.setBackgroundColor(Color.WHITE)

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String?) {
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView, errorCode: Int, description: String?, failingUrl: String?) {
                if (failingUrl == view.url) view.loadUrl("file:///android_asset/offline.html")
            }
        }

        // The lesson PDFs/DOCX aren't renderable in a WebView; let the OS's own viewer/chooser
        // handle them instead of building a downloader.
        webView.setDownloadListener { url, _, _, _, _ ->
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) webView.goBack() else {
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        }

        webView.loadUrl(BuildConfig.APP_BASE_URL)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
