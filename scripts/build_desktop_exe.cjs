const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { zipSync } = require("fflate");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const BUILD_DIR = path.join(ROOT_DIR, "build");
const ASSETS_ZIP = path.join(BUILD_DIR, "app-assets.zip");
const CS_FILE = path.join(BUILD_DIR, "DesktopHost.cs");
const EXE_PRIMARY = path.join(BUILD_DIR, "OpenRecipeBook.exe");
const EXE_RELEASE = path.join(BUILD_DIR, "OpenRecipeBook-Windows.exe");

function collectDistFiles(dir, prefix = "", map = {}) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      collectDistFiles(fullPath, relPath, map);
    } else if (entry.isFile()) {
      map[relPath] = new Uint8Array(fs.readFileSync(fullPath));
    }
  }
  return map;
}

function findCscPath() {
  const winRoot = process.env.WINDIR || process.env.SystemRoot || path.join(path.parse(process.cwd()).root, "Windows");
  const candidates = [
    path.join(winRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    path.join(winRoot, "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("Could not find .NET Framework csc.exe compiler.");
}

function getDesktopHostCSharpSource() {
  return `using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace OpenRecipeBookHost
{
    internal static class Program
    {
        private static readonly Dictionary<string, byte[]> Assets = new Dictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        private static readonly object ConfigLock = new object();
        private static string _appDataDir;
        private static string _overrideStorageDir;
        private static int _activePort;

        [STAThread]
        private static int Main(string[] args)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

            bool headless = false;
            bool selfTest = false;
            string screenshotPath = null;
            int requestedPort = 0;

            for (int i = 0; i < args.Length; i++)
            {
                string arg = args[i] ?? string.Empty;
                if (arg == "--self-test")
                {
                    selfTest = true;
                }
                else if (arg == "--screenshot" && i + 1 < args.Length)
                {
                    screenshotPath = args[++i];
                }
                else if (arg.StartsWith("--screenshot=", StringComparison.OrdinalIgnoreCase))
                {
                    screenshotPath = arg.Substring("--screenshot=".Length).Trim();
                }
                else if (arg == "--headless-server")
                {
                    headless = true;
                    if (i + 1 < args.Length)
                    {
                        int parsedPort;
                        if (int.TryParse(args[i + 1], out parsedPort))
                        {
                            requestedPort = parsedPort;
                            i++;
                        }
                    }
                }
                else if (arg.StartsWith("--data-dir=", StringComparison.OrdinalIgnoreCase))
                {
                    _appDataDir = arg.Substring("--data-dir=".Length).Trim();
                }
                else if (arg.StartsWith("--storage-dir=", StringComparison.OrdinalIgnoreCase))
                {
                    _overrideStorageDir = arg.Substring("--storage-dir=".Length).Trim();
                }
            }

            if (string.IsNullOrEmpty(_appDataDir))
            {
                _appDataDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "OpenRecipeBook"
                );
            }
            Directory.CreateDirectory(_appDataDir);
            EnsureRecipesDirectory();

            LoadEmbeddedAssets();

            TcpListener listener = new TcpListener(IPAddress.Loopback, requestedPort);
            listener.Start();
            _activePort = ((IPEndPoint)listener.LocalEndpoint).Port;

            CancellationTokenSource cts = new CancellationTokenSource();
            Task serverTask = Task.Run(() => RunServerLoop(listener, cts.Token));

            string baseUrl = "http://127.0.0.1:" + _activePort + "/";
            if (selfTest)
            {
                using (var http = new HttpClient())
                {
                    http.Timeout = TimeSpan.FromSeconds(5);
                    string homeHtml = http.GetStringAsync(baseUrl).GetAwaiter().GetResult();
                    if (string.IsNullOrEmpty(homeHtml) || !homeHtml.Contains("window.nativeApi"))
                    {
                        throw new InvalidOperationException("Self-test failed: bridge injection missing.");
                    }
                    string infoJson = http.GetStringAsync(baseUrl + "api/native/storage-info").GetAwaiter().GetResult();
                    if (string.IsNullOrEmpty(infoJson) || !infoJson.Contains("\\"ok\\":true"))
                    {
                        throw new InvalidOperationException("Self-test failed: storage endpoint error.");
                    }
                }
                Console.WriteLine("SELF_TEST_OK " + baseUrl);
                Console.Out.Flush();
                cts.Cancel();
                try { listener.Stop(); } catch { }
                return 0;
            }
            if (!string.IsNullOrEmpty(screenshotPath))
            {
                CaptureHeadlessScreenshot(baseUrl, screenshotPath);
                cts.Cancel();
                try { listener.Stop(); } catch { }
                return 0;
            }
            if (headless)
            {
                Console.WriteLine("READY " + baseUrl);
                Console.Out.Flush();
                try
                {
                    while (!cts.IsCancellationRequested)
                    {
                        Thread.Sleep(200);
                    }
                }
                catch
                {
                    // Exiting headless server
                }
                listener.Stop();
                return 0;
            }

            LaunchDesktopWindow(baseUrl);
            cts.Cancel();
            try { listener.Stop(); } catch { }
            return 0;
        }

        private static void CaptureHeadlessScreenshot(string baseUrl, string outputPath)
        {
            string browserExe = FindAppShellBrowser();
            if (string.IsNullOrEmpty(browserExe))
            {
                throw new InvalidOperationException("No Chromium or Edge executable available for --screenshot.");
            }
            string fullOut = Path.GetFullPath(outputPath);
            string targetPng = fullOut.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
                ? fullOut
                : Path.Combine(fullOut, "01_main.png");
            string parentDir = Path.GetDirectoryName(targetPng);
            if (!string.IsNullOrEmpty(parentDir))
            {
                Directory.CreateDirectory(parentDir);
            }
            string tempProfile = Path.Combine(Path.GetTempPath(), "orb-shot-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempProfile);
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = browserExe,
                    Arguments = "--headless=new --disable-gpu --no-sandbox --hide-scrollbars --virtual-time-budget=3000 --user-data-dir=\\"" + tempProfile + "\\" --window-size=1440,900 --screenshot=\\"" + targetPng + "\\" " + baseUrl,
                    UseShellExecute = false
                };
                using (Process proc = Process.Start(psi))
                {
                    if (proc == null)
                    {
                        throw new InvalidOperationException("Failed to launch headless browser.");
                    }
                    proc.WaitForExit(45000);
                }
            }
            finally
            {
                try { Directory.Delete(tempProfile, true); } catch { }
            }
            if (!File.Exists(targetPng) || new FileInfo(targetPng).Length < 1000)
            {
                throw new InvalidOperationException("Screenshot output missing or empty: " + targetPng);
            }
            Console.WriteLine("SCREENSHOT_OK " + targetPng);
            Console.Out.Flush();
        }

        private static string GetConfigPath()
        {
            return Path.Combine(_appDataDir, "storage-config.json");
        }

        private static string EnsureRecipesDirectory()
        {
            lock (ConfigLock)
            {
                string dir = _overrideStorageDir;
                if (string.IsNullOrEmpty(dir))
                {
                    dir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                        "OpenRecipeBook",
                        "recipes"
                    );
                    string cfg = GetConfigPath();
                    if (File.Exists(cfg))
                    {
                        try
                        {
                            var ser = new JavaScriptSerializer();
                            var obj = ser.Deserialize<Dictionary<string, object>>(File.ReadAllText(cfg, Encoding.UTF8));
                            if (obj != null && obj.ContainsKey("storagePath") && obj["storagePath"] != null)
                            {
                                string configured = obj["storagePath"].ToString().Trim();
                                if (!string.IsNullOrEmpty(configured))
                                {
                                    dir = configured;
                                }
                            }
                        }
                        catch
                        {
                            // Fall back to default Documents folder
                        }
                    }
                }
                Directory.CreateDirectory(dir);
                return dir;
            }
        }

        private static void SaveRecipesDirectory(string nextDir)
        {
            lock (ConfigLock)
            {
                Directory.CreateDirectory(nextDir);
                _overrideStorageDir = null;
                var ser = new JavaScriptSerializer();
                var payload = new Dictionary<string, object> { { "storagePath", nextDir } };
                File.WriteAllText(GetConfigPath(), ser.Serialize(payload), Encoding.UTF8);
            }
        }

        private static void LoadEmbeddedAssets()
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream stream = asm.GetManifestResourceStream("app-assets.zip"))
            {
                if (stream == null)
                {
                    throw new InvalidOperationException("Embedded app-assets.zip resource is missing.");
                }
                using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        if (string.IsNullOrEmpty(entry.Name)) continue;
                        string key = entry.FullName.Replace('\\\\', '/').TrimStart('/');
                        using (Stream entryStream = entry.Open())
                        using (MemoryStream ms = new MemoryStream())
                        {
                            entryStream.CopyTo(ms);
                            Assets[key] = ms.ToArray();
                        }
                    }
                }
            }
        }

        private static void LaunchDesktopWindow(string baseUrl)
        {
            string browserExe = FindAppShellBrowser();
            string profileDir = Path.Combine(_appDataDir, "WindowProfile");
            Directory.CreateDirectory(profileDir);

            if (!string.IsNullOrEmpty(browserExe))
            {
                var psi = new ProcessStartInfo
                {
                    FileName = browserExe,
                    Arguments = "--app=" + baseUrl + " --user-data-dir=\\"" + profileDir + "\\" --new-window --window-size=1280,820 --no-first-run --no-default-browser-check",
                    UseShellExecute = false
                };
                using (Process proc = Process.Start(psi))
                {
                    if (proc != null)
                    {
                        proc.WaitForExit();
                        return;
                    }
                }
            }

            Process.Start(new ProcessStartInfo(baseUrl) { UseShellExecute = true });
            Application.EnableVisualStyles();
            using (Form keeper = new Form())
            {
                keeper.Text = "OpenRecipeBook Desktop Host";
                try
                {
                    byte[] icoBytes;
                    if (Assets.TryGetValue("favicon.ico", out icoBytes))
                    {
                        using (MemoryStream ms = new MemoryStream(icoBytes))
                        {
                            keeper.Icon = new Icon(ms);
                        }
                    }
                }
                catch { }
                keeper.Width = 420;
                keeper.Height = 160;
                keeper.StartPosition = FormStartPosition.CenterScreen;
                Label lbl = new Label
                {
                    Text = "OpenRecipeBook is running at " + baseUrl + "\\r\\nClose this window to stop the local app server.",
                    Dock = DockStyle.Fill,
                    TextAlign = System.Drawing.ContentAlignment.MiddleCenter
                };
                keeper.Controls.Add(lbl);
                Application.Run(keeper);
            }
        }

        private static string FindAppShellBrowser()
        {
            string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] candidates = new[]
            {
                Path.Combine(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(pf, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(pf86, "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(local, "Google", "Chrome", "Application", "chrome.exe")
            };
            foreach (string path in candidates)
            {
                if (!string.IsNullOrEmpty(path) && File.Exists(path))
                {
                    return path;
                }
            }
            return null;
        }

        private static async Task RunServerLoop(TcpListener listener, CancellationToken token)
        {
            while (!token.IsCancellationRequested)
            {
                try
                {
                    TcpClient client = await listener.AcceptTcpClientAsync().ConfigureAwait(false);
                    var _ = Task.Run(() => HandleClient(client));
                }
                catch
                {
                    if (token.IsCancellationRequested) break;
                }
            }
        }

        private static void HandleClient(TcpClient client)
        {
            using (client)
            using (NetworkStream stream = client.GetStream())
            {
                try
                {
                    client.ReceiveTimeout = 15000;
                    client.SendTimeout = 15000;

                    byte[] headerBuf = new byte[65536];
                    int totalRead = 0;
                    int headerEnd = -1;

                    while (totalRead < headerBuf.Length)
                    {
                        int n = stream.Read(headerBuf, totalRead, headerBuf.Length - totalRead);
                        if (n <= 0) break;
                        totalRead += n;
                        headerEnd = FindHeaderEnd(headerBuf, totalRead);
                        if (headerEnd >= 0) break;
                    }

                    if (headerEnd < 0) return;

                    string headerText = Encoding.ASCII.GetString(headerBuf, 0, headerEnd);
                    string[] lines = headerText.Split(new[] { "\\r\\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] reqParts = lines[0].Split(' ');
                    if (reqParts.Length < 2) return;

                    string method = reqParts[0].Trim().ToUpperInvariant();
                    string rawTarget = reqParts[1].Trim();
                    int qIdx = rawTarget.IndexOf('?');
                    string reqPath = qIdx >= 0 ? rawTarget.Substring(0, qIdx) : rawTarget;

                    int contentLength = 0;
                    for (int i = 1; i < lines.Length; i++)
                    {
                        int colon = lines[i].IndexOf(':');
                        if (colon <= 0) continue;
                        string k = lines[i].Substring(0, colon).Trim();
                        string v = lines[i].Substring(colon + 1).Trim();
                        if (string.Equals(k, "Content-Length", StringComparison.OrdinalIgnoreCase))
                        {
                            int.TryParse(v, out contentLength);
                        }
                    }

                    byte[] bodyBytes = new byte[0];
                    if (contentLength > 0 && contentLength <= 64 * 1024 * 1024)
                    {
                        bodyBytes = new byte[contentLength];
                        int already = totalRead - (headerEnd + 4);
                        int copied = Math.Min(already, contentLength);
                        if (copied > 0)
                        {
                            Buffer.BlockCopy(headerBuf, headerEnd + 4, bodyBytes, 0, copied);
                        }
                        int remaining = contentLength - copied;
                        int offset = copied;
                        while (remaining > 0)
                        {
                            int n = stream.Read(bodyBytes, offset, remaining);
                            if (n <= 0) break;
                            offset += n;
                            remaining -= n;
                        }
                    }

                    if (reqPath.StartsWith("/api/native/", StringComparison.OrdinalIgnoreCase))
                    {
                        string bodyText = Encoding.UTF8.GetString(bodyBytes);
                        string json = HandleNativeApi(method, reqPath, bodyText);
                        WriteHttpResponse(stream, 200, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json));
                        return;
                    }

                    ServeStaticAsset(stream, reqPath);
                }
                catch
                {
                    // Ignore client disconnect
                }
            }
        }

        private static int FindHeaderEnd(byte[] buf, int length)
        {
            for (int i = 0; i <= length - 4; i++)
            {
                if (buf[i] == 13 && buf[i + 1] == 10 && buf[i + 2] == 13 && buf[i + 3] == 10)
                {
                    return i;
                }
            }
            return -1;
        }

        private static void ServeStaticAsset(NetworkStream stream, string reqPath)
        {
            string cleanPath = Uri.UnescapeDataString((reqPath ?? "/").TrimStart('/'));
            if (string.IsNullOrEmpty(cleanPath))
            {
                cleanPath = "index.html";
            }

            byte[] data;
            if (!Assets.TryGetValue(cleanPath, out data))
            {
                if (!Assets.TryGetValue("index.html", out data))
                {
                    WriteHttpResponse(stream, 404, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("Not Found"));
                    return;
                }
                cleanPath = "index.html";
            }

            if (string.Equals(cleanPath, "index.html", StringComparison.OrdinalIgnoreCase))
            {
                string html = Encoding.UTF8.GetString(data);
                string bridgeScript = BuildNativeBridgeScript();
                int headEnd = html.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
                if (headEnd >= 0)
                {
                    html = html.Insert(headEnd, bridgeScript);
                }
                else
                {
                    html = bridgeScript + html;
                }
                data = Encoding.UTF8.GetBytes(html);
            }

            WriteHttpResponse(stream, 200, GetMimeType(cleanPath), data);
        }

        private static string BuildNativeBridgeScript()
        {
            return "<script>(function(){" +
                "async function apiPost(path,body){" +
                "const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});" +
                "return await r.json();" +
                "}" +
                "async function apiGet(path){" +
                "const r=await fetch(path);" +
                "return await r.json();" +
                "}" +
                "window.nativeApi={" +
                "isDesktop:true," +
                "isElectron:false," +
                "isAndroid:false," +
                "fetchPage:function(url){return apiPost('/api/native/fetch-page',{url:url});}," +
                "getStorageInfo:function(){return apiGet('/api/native/storage-info');}," +
                "openStorageFolder:function(){return apiPost('/api/native/open-folder',{});}," +
                "chooseStorageFolder:function(){return apiPost('/api/native/choose-folder',{});}," +
                "writeStorageFile:function(filename,content){return apiPost('/api/native/write-file',{filename:filename,content:content});}," +
                "writeStorageFileBase64:function(filename,base64Data){return apiPost('/api/native/write-file-base64',{filename:filename,base64Data:base64Data});}," +
                "readStorageFile:function(filename){return apiPost('/api/native/read-file',{filename:filename});}," +
                "deleteStorageFile:function(filename){return apiPost('/api/native/delete-file',{filename:filename});}," +
                "pickAndAddFiles:function(){return apiPost('/api/native/pick-files',{});}," +
                "saveFileDialog:async function(opts){var res=await apiPost('/api/native/save-file-dialog',opts||{});return res&&res.filePath?res.filePath:null;}" +
                "};" +
                "})();</script>";
        }

        private static string HandleNativeApi(string method, string reqPath, string bodyText)
        {
            var ser = new JavaScriptSerializer { MaxJsonLength = 64 * 1024 * 1024 };
            try
            {
                if (reqPath.Equals("/api/native/storage-info", StringComparison.OrdinalIgnoreCase))
                {
                    return ser.Serialize(GetStorageInfoPayload(ser));
                }

                Dictionary<string, object> payload = string.IsNullOrWhiteSpace(bodyText)
                    ? new Dictionary<string, object>()
                    : (ser.Deserialize<Dictionary<string, object>>(bodyText) ?? new Dictionary<string, object>());

                if (reqPath.Equals("/api/native/open-folder", StringComparison.OrdinalIgnoreCase))
                {
                    string dir = EnsureRecipesDirectory();
                    Process.Start(new ProcessStartInfo("explorer.exe", "\\"" + dir + "\\"") { UseShellExecute = true });
                    return ser.Serialize(new Dictionary<string, object>
                    {
                        { "ok", true },
                        { "storagePath", dir },
                        { "message", "Opened " + dir }
                    });
                }

                if (reqPath.Equals("/api/native/choose-folder", StringComparison.OrdinalIgnoreCase))
                {
                    string currentDir = EnsureRecipesDirectory();
                    string chosen = RunSta(() =>
                    {
                        using (Form owner = CreateTopMostOwner())
                        using (FolderBrowserDialog dlg = new FolderBrowserDialog())
                        {
                            dlg.Description = "Choose Recipe Storage Folder";
                            dlg.SelectedPath = currentDir;
                            dlg.ShowNewFolderButton = true;
                            if (dlg.ShowDialog(owner) == DialogResult.OK && !string.IsNullOrWhiteSpace(dlg.SelectedPath))
                            {
                                return dlg.SelectedPath;
                            }
                            return null;
                        }
                    });
                    if (string.IsNullOrEmpty(chosen))
                    {
                        return ser.Serialize(new Dictionary<string, object> { { "ok", false }, { "canceled", true } });
                    }
                    SaveRecipesDirectory(chosen);
                    return ser.Serialize(new Dictionary<string, object> { { "ok", true }, { "storagePath", chosen } });
                }

                if (reqPath.Equals("/api/native/pick-files", StringComparison.OrdinalIgnoreCase))
                {
                    string[] paths = RunSta(() =>
                    {
                        using (Form owner = CreateTopMostOwner())
                        using (OpenFileDialog dlg = new OpenFileDialog())
                        {
                            dlg.Title = "Add Recipe Files";
                            dlg.Multiselect = true;
                            dlg.Filter = "Recipe & Backup Files|*.json;*.zip;*.paprikarecipes;*.txt;*.md;*.jsonld|All Files|*.*";
                            if (dlg.ShowDialog(owner) == DialogResult.OK)
                            {
                                return dlg.FileNames;
                            }
                            return null;
                        }
                    });
                    if (paths == null || paths.Length == 0)
                    {
                        return ser.Serialize(new Dictionary<string, object> { { "ok", false }, { "canceled", true } });
                    }
                    var fileList = new List<Dictionary<string, object>>();
                    foreach (string fp in paths)
                    {
                        byte[] bytes = File.ReadAllBytes(fp);
                        fileList.Add(new Dictionary<string, object>
                        {
                            { "name", Path.GetFileName(fp) },
                            { "contentBase64", Convert.ToBase64String(bytes) },
                            { "sizeBytes", bytes.Length }
                        });
                    }
                    return ser.Serialize(new Dictionary<string, object> { { "ok", true }, { "files", fileList } });
                }

                if (reqPath.Equals("/api/native/save-file-dialog", StringComparison.OrdinalIgnoreCase))
                {
                    string defaultName = GetStr(payload, "defaultName");
                    string chosen = RunSta(() =>
                    {
                        using (Form owner = CreateTopMostOwner())
                        using (SaveFileDialog dlg = new SaveFileDialog())
                        {
                            dlg.FileName = defaultName;
                            dlg.Filter = "All Files|*.*";
                            if (dlg.ShowDialog(owner) == DialogResult.OK)
                            {
                                return dlg.FileName;
                            }
                            return null;
                        }
                    });
                    return ser.Serialize(new Dictionary<string, object> { { "ok", !string.IsNullOrEmpty(chosen) }, { "filePath", chosen } });
                }

                if (reqPath.Equals("/api/native/write-file", StringComparison.OrdinalIgnoreCase))
                {
                    string safe = SanitizeFilename(GetStr(payload, "filename"));
                    if (string.IsNullOrEmpty(safe)) return ErrorJson(ser, "Invalid filename");
                    string target = Path.Combine(EnsureRecipesDirectory(), safe);
                    File.WriteAllText(target, GetStr(payload, "content"), Encoding.UTF8);
                    return ser.Serialize(new Dictionary<string, object> { { "ok", true }, { "path", target } });
                }

                if (reqPath.Equals("/api/native/write-file-base64", StringComparison.OrdinalIgnoreCase))
                {
                    string safe = SanitizeFilename(GetStr(payload, "filename"));
                    if (string.IsNullOrEmpty(safe)) return ErrorJson(ser, "Invalid filename");
                    string target = Path.Combine(EnsureRecipesDirectory(), safe);
                    byte[] raw = Convert.FromBase64String(GetStr(payload, "base64Data"));
                    File.WriteAllBytes(target, raw);
                    return ser.Serialize(new Dictionary<string, object> { { "ok", true }, { "path", target } });
                }

                if (reqPath.Equals("/api/native/read-file", StringComparison.OrdinalIgnoreCase))
                {
                    string safe = SanitizeFilename(GetStr(payload, "filename"));
                    if (string.IsNullOrEmpty(safe)) return ErrorJson(ser, "Invalid filename");
                    string target = Path.Combine(EnsureRecipesDirectory(), safe);
                    if (!File.Exists(target)) return ErrorJson(ser, "File not found");
                    return ser.Serialize(new Dictionary<string, object> { { "ok", true }, { "content", File.ReadAllText(target, Encoding.UTF8) } });
                }

                if (reqPath.Equals("/api/native/delete-file", StringComparison.OrdinalIgnoreCase))
                {
                    string safe = SanitizeFilename(GetStr(payload, "filename"));
                    if (string.IsNullOrEmpty(safe)) return ErrorJson(ser, "Invalid filename");
                    string target = Path.Combine(EnsureRecipesDirectory(), safe);
                    if (File.Exists(target))
                    {
                        File.Delete(target);
                    }
                    return ser.Serialize(new Dictionary<string, object> { { "ok", true } });
                }

                if (reqPath.Equals("/api/native/fetch-page", StringComparison.OrdinalIgnoreCase))
                {
                    string url = GetStr(payload, "url");
                    var handler = new HttpClientHandler
                    {
                        AutomaticDecompression = System.Net.DecompressionMethods.GZip | System.Net.DecompressionMethods.Deflate,
                        AllowAutoRedirect = true
                    };
                    using (var http = new HttpClient(handler))
                    {
                        http.Timeout = TimeSpan.FromSeconds(15);
                        http.DefaultRequestHeaders.TryAddWithoutValidation(
                            "User-Agent",
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
                        );
                        http.DefaultRequestHeaders.TryAddWithoutValidation(
                            "Accept",
                            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        );
                        http.DefaultRequestHeaders.TryAddWithoutValidation("Accept-Language", "en-US,en;q=0.9");
                        var resp = http.GetAsync(url).GetAwaiter().GetResult();
                        string html = resp.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                        return ser.Serialize(new Dictionary<string, object>
                        {
                            { "ok", resp.IsSuccessStatusCode },
                            { "status", (int)resp.StatusCode },
                            { "html", html },
                            { "error", resp.IsSuccessStatusCode ? "" : ("HTTP " + (int)resp.StatusCode) }
                        });
                    }
                }

                return ErrorJson(ser, "Unknown endpoint: " + reqPath);
            }
            catch (Exception ex)
            {
                return ErrorJson(ser, ex.Message);
            }
        }

        private static Dictionary<string, object> GetStorageInfoPayload(JavaScriptSerializer ser)
        {
            string dir = EnsureRecipesDirectory();
            DirectoryInfo di = new DirectoryInfo(dir);
            FileInfo[] rawFiles = di.GetFiles();
            Array.Sort(rawFiles, (a, b) => b.LastWriteTimeUtc.CompareTo(a.LastWriteTimeUtc));

            var files = new List<Dictionary<string, object>>();
            foreach (FileInfo fi in rawFiles)
            {
                string kind = ClassifyFile(fi.Name);
                string recipeId = null;
                string recipeTitle = null;
                if (kind == "recipe" && fi.Length < 2 * 1024 * 1024)
                {
                    try
                    {
                        var parsed = ser.Deserialize<Dictionary<string, object>>(File.ReadAllText(fi.FullName, Encoding.UTF8));
                        if (parsed != null)
                        {
                            if (parsed.ContainsKey("format") && string.Equals(Convert.ToString(parsed["format"]), "openrecipebook-recipe", StringComparison.Ordinal) && parsed.ContainsKey("recipe"))
                            {
                                var rec = parsed["recipe"] as Dictionary<string, object>;
                                if (rec != null)
                                {
                                    if (rec.ContainsKey("id")) recipeId = Convert.ToString(rec["id"]);
                                    if (rec.ContainsKey("title")) recipeTitle = Convert.ToString(rec["title"]);
                                }
                            }
                            else if (parsed.ContainsKey("title"))
                            {
                                if (parsed.ContainsKey("id")) recipeId = Convert.ToString(parsed["id"]);
                                recipeTitle = Convert.ToString(parsed["title"]);
                            }
                        }
                    }
                    catch
                    {
                        // Ignore malformed JSON
                    }
                }

                var entry = new Dictionary<string, object>
                {
                    { "name", fi.Name },
                    { "path", fi.FullName },
                    { "sizeBytes", fi.Length },
                    { "updatedAt", fi.LastWriteTimeUtc.ToString("o") },
                    { "kind", kind }
                };
                if (!string.IsNullOrEmpty(recipeId)) entry["recipeId"] = recipeId;
                if (!string.IsNullOrEmpty(recipeTitle)) entry["recipeTitle"] = recipeTitle;
                files.Add(entry);
            }

            return new Dictionary<string, object>
            {
                { "ok", true },
                { "platform", "desktop" },
                { "storagePath", dir },
                { "canOpenSystemFolder", true },
                { "canChooseFolder", true },
                { "files", files }
            };
        }

        private static string ClassifyFile(string filename)
        {
            string lower = (filename ?? string.Empty).ToLowerInvariant();
            if (lower == "library-metadata.json") return "metadata";
            if (lower.EndsWith(".recipe.json") || lower.EndsWith(".json") || lower.EndsWith(".jsonld")) return "recipe";
            if (lower.EndsWith(".zip") || lower.EndsWith(".paprikarecipes")) return "archive";
            if (lower.EndsWith(".txt") || lower.EndsWith(".md")) return "text";
            return "other";
        }

        private static string SanitizeFilename(string rawName)
        {
            string cleaned = (rawName ?? string.Empty).Replace('/', '_').Replace('\\\\', '_').Replace("..", "").Trim();
            foreach (char bad in Path.GetInvalidFileNameChars())
            {
                cleaned = cleaned.Replace(bad, '_');
            }
            if (string.IsNullOrEmpty(cleaned) || cleaned == ".") return string.Empty;
            return cleaned;
        }

        private static string GetStr(Dictionary<string, object> map, string key)
        {
            if (map != null && map.ContainsKey(key) && map[key] != null)
            {
                return map[key].ToString();
            }
            return string.Empty;
        }

        private static string ErrorJson(JavaScriptSerializer ser, string message)
        {
            return ser.Serialize(new Dictionary<string, object> { { "ok", false }, { "error", message ?? "Error" } });
        }

        private static Form CreateTopMostOwner()
        {
            Form f = new Form();
            f.TopMost = true;
            f.ShowInTaskbar = false;
            f.WindowState = FormWindowState.Minimized;
            f.StartPosition = FormStartPosition.Manual;
            f.Location = new System.Drawing.Point(-10000, -10000);
            f.Show();
            f.Activate();
            return f;
        }

        private static T RunSta<T>(Func<T> fn)
        {
            T result = default(T);
            Exception captured = null;
            Thread t = new Thread(() =>
            {
                try
                {
                    result = fn();
                }
                catch (Exception ex)
                {
                    captured = ex;
                }
            });
            t.SetApartmentState(ApartmentState.STA);
            t.Start();
            t.Join();
            if (captured != null) throw captured;
            return result;
        }

        private static void WriteHttpResponse(NetworkStream stream, int status, string contentType, byte[] body)
        {
            string statusText = status == 200 ? "OK" : "Not Found";
            string headers =
                "HTTP/1.1 " + status + " " + statusText + "\\r\\n" +
                "Content-Type: " + contentType + "\\r\\n" +
                "Content-Length: " + body.Length + "\\r\\n" +
                "Cache-Control: no-store\\r\\n" +
                "Connection: close\\r\\n\\r\\n";
            byte[] headerBytes = Encoding.ASCII.GetBytes(headers);
            stream.Write(headerBytes, 0, headerBytes.Length);
            stream.Write(body, 0, body.Length);
            stream.Flush();
        }

        private static string GetMimeType(string path)
        {
            string lower = path.ToLowerInvariant();
            if (lower.EndsWith(".html")) return "text/html; charset=utf-8";
            if (lower.EndsWith(".js") || lower.EndsWith(".mjs")) return "application/javascript; charset=utf-8";
            if (lower.EndsWith(".css")) return "text/css; charset=utf-8";
            if (lower.EndsWith(".svg")) return "image/svg+xml";
            if (lower.EndsWith(".png")) return "image/png";
            if (lower.EndsWith(".jpg") || lower.EndsWith(".jpeg")) return "image/jpeg";
            if (lower.EndsWith(".webp")) return "image/webp";
            if (lower.EndsWith(".json")) return "application/json; charset=utf-8";
            if (lower.EndsWith(".ico")) return "image/x-icon";
            return "application/octet-stream";
        }
    }
}
`;
}

function buildDesktopExe() {
  if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    throw new Error("dist/index.html is missing. Run 'npm run build' first.");
  }

  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const fileMap = collectDistFiles(DIST_DIR);
  const zipBytes = zipSync(fileMap, { level: 6 });
  fs.writeFileSync(ASSETS_ZIP, zipBytes);

  fs.writeFileSync(CS_FILE, getDesktopHostCSharpSource(), "utf8");

  const icoPath = path.join(BUILD_DIR, "app.ico");
  const brandIco = path.join(ROOT_DIR, "assets", "icon.ico");
  const publicIco = path.join(ROOT_DIR, "public", "favicon.ico");
  if (fs.existsSync(brandIco)) {
    fs.copyFileSync(brandIco, icoPath);
  } else if (fs.existsSync(publicIco)) {
    fs.copyFileSync(publicIco, icoPath);
  }

  const cscPath = findCscPath();
  const cscArgs = [
    "/nologo",
    "/optimize+",
    "/target:winexe",
    `/out:${EXE_PRIMARY}`,
    ...(fs.existsSync(icoPath) ? [`/win32icon:${icoPath}`] : []),
    `/resource:${ASSETS_ZIP},app-assets.zip`,
    "/reference:System.dll",
    "/reference:System.Core.dll",
    "/reference:System.Drawing.dll",
    "/reference:System.IO.Compression.dll",
    "/reference:System.IO.Compression.FileSystem.dll",
    "/reference:System.Net.Http.dll",
    "/reference:System.Web.Extensions.dll",
    "/reference:System.Windows.Forms.dll",
    CS_FILE
  ];

  execFileSync(cscPath, cscArgs, { stdio: "inherit" });
  fs.copyFileSync(EXE_PRIMARY, EXE_RELEASE);

  console.log(`Built ${EXE_PRIMARY}`);
  console.log(`Built ${EXE_RELEASE}`);
}

buildDesktopExe();
