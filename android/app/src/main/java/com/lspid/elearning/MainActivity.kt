package com.lspid.elearning

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.webkit.MimeTypeMap
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileNotFoundException
import android.view.Gravity
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.activity.addCallback
import androidx.appcompat.app.AppCompatActivity
import android.content.ActivityNotFoundException

/**
 * Whole app is one WebView pointed at [BuildConfig.APP_BASE_URL]. The site already is the
 * product; a native shell just needs to host it, hand off downloads the WebView can't render,
 * and stay out of the way on weak hardware/networks.
 */
class MainActivity : AppCompatActivity() {

    private companion object {
        // Virtual https origin the full build serves its bundled site from (assets/site/).
        // A real https origin, unlike file://, keeps relative links, fetch() and storage working.
        const val ASSET_HOST = "appassets.androidplatform.net"
        const val ASSET_ORIGIN = "https://$ASSET_HOST/"
        // The WebView can't show these; hand them to whatever viewer the phone has.
        val EXTERNAL_DOCS = setOf("pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx")

        // WebView stays blank on a PDF iframe, so the viewer pages get a button that
        // navigates to the file instead, which openAsset() then intercepts.
        const val PDF_FIX_JS = """(function(){var f=document.querySelector('iframe.doc-view__frame');if(!f||!/\.(pdf|docx?|pptx?)([?#]|$)/i.test(f.src))return;var a=document.createElement('a');a.className='btn-home';a.href=f.src;a.textContent='Open document';var p=document.createElement('p');p.style.cssText='text-align:center;padding:40px 16px';p.appendChild(a);f.replaceWith(p);})();"""
        const val HIDE_GET_APP_JS = """(function(){var b=document.getElementById('share-app-btn');if(b)b.hidden=true;})();"""
    }

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
        File(cacheDir, "docs").deleteRecursively() // copies made for external viewers on a previous run

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
                if (BuildConfig.OFFLINE_BUNDLE) {
                    view.evaluateJavascript(PDF_FIX_JS, null)
                    view.evaluateJavascript(HIDE_GET_APP_JS, null) // the app is already installed
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.host != ASSET_HOST) return false
                val path = uri.path.orEmpty()
                if (path.substringAfterLast('.', "").lowercase() in EXTERNAL_DOCS) {
                    openAsset(path.trimStart('/'))
                    return true
                }
                return false
            }

            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (!BuildConfig.OFFLINE_BUNDLE || request.url.host != ASSET_HOST) return null
                return serveAsset(request.url.path.orEmpty().trimStart('/'))
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
            val uri = Uri.parse(url)
            if (uri.host == ASSET_HOST) openAsset(uri.path.orEmpty().trimStart('/'))
            else startActivity(Intent(Intent.ACTION_VIEW, uri))
        }

        onBackPressedDispatcher.addCallback(this) {
            if (webView.canGoBack()) webView.goBack() else {
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        }

        webView.loadUrl(if (BuildConfig.OFFLINE_BUNDLE) ASSET_ORIGIN + "index.html" else BuildConfig.APP_BASE_URL)
    }

    /** Streams assets/site/<path> to the WebView; folders resolve to their index.html. */
    private fun serveAsset(rawPath: String): WebResourceResponse {
        var path = rawPath
        if (path.isEmpty() || path.endsWith("/")) path += "index.html"
        val stream = try {
            assets.open("site/$path")
        } catch (e: FileNotFoundException) {
            try {
                path = path.trimEnd('/') + "/index.html" // a folder written without its trailing slash
                assets.open("site/$path")
            } catch (e2: FileNotFoundException) {
                return WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), "Not found".byteInputStream())
            }
        }
        val ext = path.substringAfterLast('.', "").lowercase()
        val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: when (ext) {
            "jfif" -> "image/jpeg"
            else -> "application/octet-stream"
        }
        val isText = mime.startsWith("text/") || mime == "application/javascript" || mime == "image/svg+xml"
        return WebResourceResponse(mime, if (isText) "utf-8" else null, stream)
    }

    /** Copies a bundled document out of the APK and opens it in the phone's own viewer. */
    private fun openAsset(path: String) {
        try {
            val out = File(File(cacheDir, "docs").apply { mkdirs() }, path.substringAfterLast('/'))
            if (!out.exists()) assets.open("site/$path").use { i -> out.outputStream().use { i.copyTo(it) } }
            val ext = out.extension.lowercase()
            val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "*/*"
            val uri = FileProvider.getUriForFile(this, "$packageName.docs", out)
            startActivity(
                Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, mime)
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "No app on this phone can open this document", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Couldn't open this document", Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
