# The site calls MainActivity.SiteBridge from JavaScript by method name.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
