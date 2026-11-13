package org.openrecipebook.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {
    private static final String APP_ORIGIN = "https://appassets.androidplatform.net";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (filePathCallback != null) {
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        Intent data = result.getData();
                        if (data.getClipData() != null) {
                            int count = data.getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        } else if (data.getData() != null) {
                            results = new Uri[] { data.getData() };
                        }
                    }
                    filePathCallback.onReceiveValue(results);
                    filePathCallback = null;
                }
            }
        );

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView.setWebViewClient(new WebViewClient() {
            @Nullable
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String url = uri.toString();
                if (url.startsWith(APP_ORIGIN + "/")) {
                    return false;
                }
                String scheme = uri.getScheme();
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(browserIntent);
                    } catch (Exception ignored) {
                        // Ignore when no browser handler is installed
                    }
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && url.startsWith(APP_ORIGIN)) {
                    injectNativeBridge(view);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView webView,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");

        String targetUrl = APP_ORIGIN + "/index.html";
        String sharedUrl = extractSharedUrl(getIntent());
        if (sharedUrl != null && !sharedUrl.isEmpty()) {
            try {
                targetUrl += "#import-url=" + URLEncoder.encode(sharedUrl, "UTF-8");
            } catch (Exception ignored) {
                targetUrl += "#import-url=" + sharedUrl;
            }
        }

        webView.loadUrl(targetUrl);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String sharedUrl = extractSharedUrl(intent);
        if (sharedUrl != null && !sharedUrl.isEmpty() && webView != null) {
            try {
                String hashUrl = APP_ORIGIN + "/index.html#import-url=" + URLEncoder.encode(sharedUrl, "UTF-8");
                webView.loadUrl(hashUrl);
            } catch (Exception ignored) {
                webView.loadUrl(APP_ORIGIN + "/index.html#import-url=" + sharedUrl);
            }
        }
    }

    private String extractSharedUrl(@Nullable Intent intent) {
        if (intent == null) return null;
        String action = intent.getAction();
        String type = intent.getType();
        if (Intent.ACTION_SEND.equals(action) && type != null && "text/plain".equals(type)) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null) {
                int httpIdx = sharedText.indexOf("http://");
                int httpsIdx = sharedText.indexOf("https://");
                int startIdx = httpsIdx >= 0 ? httpsIdx : httpIdx;
                if (startIdx >= 0) {
                    int endIdx = sharedText.indexOf(" ", startIdx);
                    return endIdx > startIdx ? sharedText.substring(startIdx, endIdx) : sharedText.substring(startIdx);
                }
                return sharedText.trim();
            }
        }
        return null;
    }

    private void injectNativeBridge(@NonNull WebView view) {
        String js = "(function() {" +
            "  if (window.nativeApi && window.nativeApi.isAndroid) return;" +
            "  window.nativeApi = {" +
            "    isAndroid: true," +
            "    isElectron: false," +
            "    fetchPage: async function(url) {" +
            "      if (window.AndroidBridge && window.AndroidBridge.fetchUrl) {" +
            "        try {" +
            "          var res = window.AndroidBridge.fetchUrl(url);" +
            "          return JSON.parse(res);" +
            "        } catch (e) {" +
            "          return { ok: false, error: String(e) };" +
            "        }" +
            "      }" +
            "      return { ok: false, error: 'AndroidBridge unavailable' };" +
            "    }" +
            "  };" +
            "})();";
        view.evaluateJavascript(js, null);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    public static class NativeBridge {
        private static String buildErrorResponse(String message) {
            try {
                JSONObject err = new JSONObject();
                err.put("ok", false);
                err.put("error", message);
                return err.toString();
            } catch (Exception ignored) {
                return "{\"ok\":false,\"error\":\"Network error\"}";
            }
        }

        @JavascriptInterface
        public String fetchUrl(String targetUrl) {
            try {
                URL url = new URL(targetUrl);
                String protocol = url.getProtocol();
                if (!"https".equalsIgnoreCase(protocol) && !"http".equalsIgnoreCase(protocol)) {
                    return buildErrorResponse("Unsupported URL scheme");
                }
                String host = url.getHost();
                if (host == null || host.isEmpty()) {
                    return buildErrorResponse("Missing URL host");
                }
                InetAddress address = InetAddress.getByName(host);
                if (
                    address.isLoopbackAddress() ||
                    address.isLinkLocalAddress() ||
                    address.isSiteLocalAddress() ||
                    address.isAnyLocalAddress()
                ) {
                    return buildErrorResponse("Blocked private or local address");
                }

                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(12000);
                conn.setRequestProperty(
                    "User-Agent",
                    "OpenRecipeBook-Android/0.1.4 (+https://github.com/DontKwo/OpenRecipeBook)"
                );
                int status = conn.getResponseCode();
                InputStream in = (status >= 200 && status < 400) ? conn.getInputStream() : conn.getErrorStream();
                StringBuilder sb = new StringBuilder();
                if (in != null) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append('\n');
                    }
                    reader.close();
                }

                JSONObject res = new JSONObject();
                res.put("ok", status >= 200 && status < 300);
                res.put("status", status);
                res.put("html", sb.toString());
                return res.toString();
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "Network error";
                return buildErrorResponse(msg);
            }
        }
    }
}
