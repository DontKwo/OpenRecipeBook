const fs = require("fs");
const path = require("path");
const os = require("os");
const assert = require("assert");
const http = require("http");
const { spawn } = require("child_process");

const EXE_PATH = path.resolve(__dirname, "..", "build", "OpenRecipeBook.exe");

function httpRequest(url, method = "GET", bodyObj = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyText = bodyObj !== null ? JSON.stringify(bodyObj) : null;
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method,
        headers: bodyText
          ? {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(bodyText)
            }
          : {}
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );
    req.on("error", reject);
    if (bodyText) req.write(bodyText);
    req.end();
  });
}

async function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for desktop exe server. stdout=${stdout} stderr=${stderr}`));
    }, 10000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      const match = /READY\s+(http:\/\/127\.0\.0\.1:\d+\/)/.exec(stdout);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Desktop exe exited early with code ${code}. stderr=${stderr}`));
    });
  });
}

async function run() {
  assert.ok(fs.existsSync(EXE_PATH), `Missing executable at ${EXE_PATH}`);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orb-exe-test-"));
  const dataDir = path.join(tempRoot, "host-config");
  const storageDir = path.join(tempRoot, "recipes");

  const child = spawn(
    EXE_PATH,
    ["--headless-server", "0", `--data-dir=${dataDir}`, `--storage-dir=${storageDir}`],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  try {
    const baseUrl = await waitForServer(child);

    // 1. Verify embedded index.html serves with injected window.nativeApi
    const indexRes = await httpRequest(baseUrl);
    assert.strictEqual(indexRes.status, 200);
    assert.ok(indexRes.body.includes("window.nativeApi"), "index.html must inject window.nativeApi");
    assert.ok(indexRes.body.includes("isDesktop:true"), "nativeApi must mark isDesktop:true");

    // 2. Write a .recipe.json file directly to disk via native endpoint
    const sampleRecipe = {
      format: "openrecipebook-recipe",
      version: 1,
      exportedAt: "2026-11-17T00:00:00.000Z",
      recipe: {
        id: "rec-test-1",
        title: "Skillet Cornbread",
        servings: 8
      }
    };
    const writeRes = await httpRequest(`${baseUrl}api/native/write-file`, "POST", {
      filename: "skillet-cornbread__rec-test-1.recipe.json",
      content: JSON.stringify(sampleRecipe, null, 2)
    });
    const writeJson = JSON.parse(writeRes.body);
    assert.strictEqual(writeJson.ok, true);
    assert.ok(fs.existsSync(path.join(storageDir, "skillet-cornbread__rec-test-1.recipe.json")));

    // 3. Path traversal sanitization check
    await httpRequest(`${baseUrl}api/native/write-file`, "POST", {
      filename: "../../outside.recipe.json",
      content: "{}"
    });
    assert.strictEqual(fs.existsSync(path.join(tempRoot, "outside.recipe.json")), false);

    // 4. Inspect storage-info
    const infoRes = await httpRequest(`${baseUrl}api/native/storage-info`);
    const infoJson = JSON.parse(infoRes.body);
    assert.strictEqual(infoJson.ok, true);
    assert.strictEqual(infoJson.platform, "desktop");
    assert.strictEqual(infoJson.storagePath, storageDir);
    assert.strictEqual(infoJson.canOpenSystemFolder, true);
    assert.strictEqual(infoJson.canChooseFolder, true);
    const cornbread = infoJson.files.find((f) => f.recipeId === "rec-test-1");
    assert.ok(cornbread, "storage-info must list written recipe file with metadata");
    assert.strictEqual(cornbread.recipeTitle, "Skillet Cornbread");

    // 5. Read back file contents
    const readRes = await httpRequest(`${baseUrl}api/native/read-file`, "POST", {
      filename: "skillet-cornbread__rec-test-1.recipe.json"
    });
    const readJson = JSON.parse(readRes.body);
    assert.strictEqual(readJson.ok, true);
    assert.ok(readJson.content.includes("Skillet Cornbread"));

    // 6. Delete file
    const delRes = await httpRequest(`${baseUrl}api/native/delete-file`, "POST", {
      filename: "skillet-cornbread__rec-test-1.recipe.json"
    });
    assert.strictEqual(JSON.parse(delRes.body).ok, true);
    assert.strictEqual(fs.existsSync(path.join(storageDir, "skillet-cornbread__rec-test-1.recipe.json")), false);

    console.log("Desktop executable verification passed.");
  } finally {
    child.kill();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
