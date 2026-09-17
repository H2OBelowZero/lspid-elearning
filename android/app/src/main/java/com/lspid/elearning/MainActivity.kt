package com.lspid.elearning

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.view.Gravity
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
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

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

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

        // Some lesson pages link out with target="_blank" (e.g. external reading resources).
        // With no WebChromeClient, WebView has nowhere to put that new window and on several
        // OEM WebView builds it blanks the CURRENT page instead of just ignoring the request.
        // Hand those off to the system browser via a throwaway WebView instead.
        webView.settings.setSupportMultipleWindows(true)
        webView.webChromeClient = object : WebChromeClient() {
            override fun onCreateWindow(
                view: WebView,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message
            ): Boolean {
                val popup = WebView(this@MainActivity)
                popup.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(v: WebView, url: String): Boolean {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        return true
                    }
                }
                (resultMsg.obj as WebView.WebViewTransport).webView = popup
                resultMsg.sendToTarget()
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView, url: String?) {
                progressBar.visibility = View.GONE
            }

            // On slow connections/devices, tapping a new link before the current page finishes
            // aborts that in-flight load, which WebView reports here as ERROR_UNKNOWN for the
            // OLD page's own URL. The previous code treated that the same as a real failure and
            // redirected to offline.html, cancelling the brand-new navigation the user just
            // started — the app looked frozen, then wrongly claimed there was no connection.
            // Only main-frame errors that aren't a superseded/aborted load are real failures.
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && error.errorCode != ERROR_UNKNOWN) {
                    view.loadUrl("file:///android_asset/offline.html")
                }
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
