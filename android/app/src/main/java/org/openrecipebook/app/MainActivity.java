package org.openrecipebook.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.util.Base64;
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
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONArray;
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

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                if (fileChooserParams != null && fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        webView.addJavascriptInterface(new NativeBridge(this), "AndroidBridge");

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
            "  function callBridge(fnName, args) {" +
            "    if (window.AndroidBridge && typeof window.AndroidBridge[fnName] === 'function') {" +
            "      try {" +
            "        var raw = window.AndroidBridge[fnName].apply(window.AndroidBridge, args || []);" +
            "        return Promise.resolve(JSON.parse(raw));" +
            "      } catch (e) {" +
            "        return Promise.resolve({ ok: false, error: String(e) });" +
            "      }" +
            "    }" +
            "    return Promise.resolve({ ok: false, error: 'AndroidBridge unavailable' });" +
            "  }" +
            "  window.nativeApi = {" +
            "    isAndroid: true," +
            "    isDesktop: false," +
            "    isElectron: false," +
            "    fetchPage: function(url) { return callBridge('fetchUrl', [url]); }," +
            "    getStorageInfo: function() { return callBridge('getStorageInfo', []); }," +
            "    openStorageFolder: function() { return callBridge('openStorageFolder', []); }," +
            "    writeStorageFile: function(name, content) { return callBridge('writeStorageFile', [name, content]); }," +
            "    writeStorageFileBase64: function(name, b64) { return callBridge('writeStorageFileBase64', [name, b64]); }," +
            "    readStorageFile: function(name) { return callBridge('readStorageFile', [name]); }," +
            "    deleteStorageFile: function(name) { return callBridge('deleteStorageFile', [name]); }" +
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
        private final Context context;

        public NativeBridge(Context context) {
            this.context = context;
        }

        private File getRecipesDir() {
            File base = context.getExternalFilesDir("recipes");
            if (base == null) {
                base = new File(context.getFilesDir(), "recipes");
            }
            if (!base.exists()) {
                base.mkdirs();
            }
            return base;
        }

        private static String sanitizeFilename(String rawName) {
            if (rawName == null) return "";
            String cleaned = rawName.replace('/', '_').replace('\\', '_').replace("..", "").trim();
            if (cleaned.isEmpty() || ".".equals(cleaned)) {
                return "";
            }
            return cleaned;
        }

        private static String classifyFile(String filename) {
            String lower = filename.toLowerCase(Locale.US);
            if ("library-metadata.json".equals(lower)) return "metadata";
            if (lower.endsWith(".recipe.json") || lower.endsWith(".json") || lower.endsWith(".jsonld")) return "recipe";
            if (lower.endsWith(".zip") || lower.endsWith(".paprikarecipes")) return "archive";
            if (lower.endsWith(".txt") || lower.endsWith(".md")) return "text";
            return "other";
        }

        private static String formatIsoUtc(long epochMillis) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
            return sdf.format(new Date(epochMillis));
        }

        private static String readAllUtf8(File file) throws Exception {
            FileInputStream fis = new FileInputStream(file);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int len;
            while ((len = fis.read(buf)) != -1) {
                out.write(buf, 0, len);
            }
            fis.close();
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }

        private static String buildErrorResponse(String message) {
            try {
                JSONObject err = new JSONObject();
                err.put("ok", false);
                err.put("error", message);
                return err.toString();
            } catch (Exception ignored) {
                return "{\"ok\":false,\"error\":\"Operation failed\"}";
            }
        }

        @JavascriptInterface
        public String getStorageInfo() {
            try {
                File dir = getRecipesDir();
                File[] list = dir.listFiles();
                JSONArray filesArray = new JSONArray();
                if (list != null) {
                    Arrays.sort(list, Comparator.comparingLong(File::lastModified).reversed());
                    for (File f : list) {
                        if (!f.isFile()) continue;
                        String name = f.getName();
                        String kind = classifyFile(name);
                        JSONObject item = new JSONObject();
                        item.put("name", name);
                        item.put("path", f.getAbsolutePath());
                        item.put("sizeBytes", f.length());
                        item.put("updatedAt", formatIsoUtc(f.lastModified()));
                        item.put("kind", kind);
                        if ("recipe".equals(kind) && f.length() < 1024 * 1024) {
                            try {
                                JSONObject parsed = new JSONObject(readAllUtf8(f));
                                if ("openrecipebook-recipe".equals(parsed.optString("format")) && parsed.has("recipe")) {
                                    JSONObject rec = parsed.getJSONObject("recipe");
                                    item.put("recipeId", rec.optString("id", ""));
                                    item.put("recipeTitle", rec.optString("title", ""));
                                } else if (parsed.has("title")) {
                                    item.put("recipeId", parsed.optString("id", ""));
                                    item.put("recipeTitle", parsed.optString("title", ""));
                                }
                            } catch (Exception ignored) {
                                // Ignore non-recipe JSON metadata
                            }
                        }
                        filesArray.put(item);
                    }
                }
                JSONObject res = new JSONObject();
                res.put("ok", true);
                res.put("platform", "android");
                res.put("storagePath", dir.getAbsolutePath());
                res.put("canOpenSystemFolder", true);
                res.put("canChooseFolder", false);
                res.put("files", filesArray);
                return res.toString();
            } catch (Exception e) {
                return buildErrorResponse(e.getMessage() != null ? e.getMessage() : "Unable to read storage folder");
            }
        }

        @JavascriptInterface
        public String writeStorageFile(String filename, String content) {
            try {
                String safe = sanitizeFilename(filename);
                if (safe.isEmpty()) return buildErrorResponse("Invalid filename");
                File target = new File(getRecipesDir(), safe);
                FileOutputStream fos = new FileOutputStream(target, false);
                fos.write((content != null ? content : "").getBytes(StandardCharsets.UTF_8));
                fos.close();
                JSONObject res = new JSONObject();
                res.put("ok", true);
                res.put("path", target.getAbsolutePath());
                return res.toString();
            } catch (Exception e) {
                return buildErrorResponse(e.getMessage() != null ? e.getMessage() : "Write failed");
            }
        }

        @JavascriptInterface
        public String writeStorageFileBase64(String filename, String base64Data) {
            try {
                String safe = sanitizeFilename(filename);
                if (safe.isEmpty()) return buildErrorResponse("Invalid filename");
                byte[] decoded = Base64.decode(base64Data != null ? base64Data : "", Base64.DEFAULT);
                File target = new File(getRecipesDir(), safe);
                FileOutputStream fos = new FileOutputStream(target, false);
                fos.write(decoded);
                fos.close();
                JSONObject res = new JSONObject();
                res.put("ok", true);
                res.put("path", target.getAbsolutePath());
                return res.toString();
            } catch (Exception e) {
                return buildErrorResponse(e.getMessage() != null ? e.getMessage() : "Binary write failed");
            }
        }

        @JavascriptInterface
        public String readStorageFile(String filename) {
            try {
                String safe = sanitizeFilename(filename);
                if (safe.isEmpty()) return buildErrorResponse("Invalid filename");
                File target = new File(getRecipesDir(), safe);
                if (!target.exists() || !target.isFile()) {
                    return buildErrorResponse("File not found");
                }
                JSONObject res = new JSONObject();
                res.put("ok", true);
                res.put("content", readAllUtf8(target));
                return res.toString();
            } catch (Exception e) {
                return buildErrorResponse(e.getMessage() != null ? e.getMessage() : "Read failed");
            }
        }

        @JavascriptInterface
        public String deleteStorageFile(String filename) {
            try {
                String safe = sanitizeFilename(filename);
                if (safe.isEmpty()) return buildErrorResponse("Invalid filename");
                File target = new File(getRecipesDir(), safe);
                boolean deleted = !target.exists() || target.delete();
                JSONObject res = new JSONObject();
                res.put("ok", deleted);
                return res.toString();
            } catch (Exception e) {
                return buildErrorResponse(e.getMessage() != null ? e.getMessage() : "Delete failed");
            }
        }

        @JavascriptInterface
        public String openStorageFolder() {
            File dir = getRecipesDir();
            boolean launched = false;
            try {
                Uri docUri = Uri.parse(
                    "content://com.android.externalstorage.documents/document/" +
                    URLEncoder.encode("primary:Android/data/org.openrecipebook.app/files/recipes", "UTF-8")
                );
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(docUri, DocumentsContract.Document.MIME_TYPE_DIR);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                context.startActivity(intent);
                launched = true;
            } catch (Exception ignored) {
                try {
                    Intent fallback = new Intent(Intent.ACTION_VIEW);
                    fallback.setDataAndType(Uri.fromFile(dir), "resource/folder");
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(fallback);
                    launched = true;
                } catch (Exception ignored2) {
                    // Android 11+ restricts external apps opening Android/data directly
                }
            }
            try {
                JSONObject res = new JSONObject();
                res.put("ok", true);
                res.put("storagePath", dir.getAbsolutePath());
                res.put(
                    "message",
                    launched
                        ? "Opened folder: " + dir.getAbsolutePath()
                        : "Storage folder: " + dir.getAbsolutePath()
                );
                return res.toString();
            } catch (Exception e) {
                return buildErrorResponse("Unable to open folder");
            }
        }

        @JavascriptInterface
        public void setStatusBarColor(String hexColor) {
            if (hexColor == null || hexColor.isEmpty()) return;
            if (context instanceof android.app.Activity) {
                android.app.Activity activity = (android.app.Activity) context;
                activity.runOnUiThread(() -> {
                    try {
                        int color = android.graphics.Color.parseColor(hexColor);
                        activity.getWindow().setStatusBarColor(color);
                    } catch (Exception ignored) {
                    }
                });
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
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(12000);
                conn.setReadTimeout(12000);
                conn.setRequestProperty(
                    "User-Agent",
                    "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
                );
                conn.setRequestProperty("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                conn.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
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
                if (status < 200 || status >= 300) {
                    res.put("error", "HTTP " + status);
                }
                return res.toString();
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage() : "Network error";
                return buildErrorResponse(msg);
            }
        }
    }
}
