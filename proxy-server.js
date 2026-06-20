const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const rootDir = __dirname;
const port = Number(process.argv[2] || process.env.PORT || 5500);
const host = process.env.HOST || "127.0.0.1";
const configFile = path.join(rootDir, "html_config.json");
const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
};

function readConfig() {
    const rawConfig = fs.readFileSync(configFile, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(rawConfig);
}

function getTargetAppUrl() {
    const config = readConfig();
    const target = config.api && config.api.baseUrl;

    if (!target) {
        throw new Error("html_config.json is missing api.baseUrl");
    }

    return new URL(target);
}

function send(res, statusCode, body, headers) {
    res.writeHead(statusCode, Object.assign({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "APIKey, Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    }, headers || {}));
    res.end(body);
}

function serveLocalConfig(res) {
    const config = readConfig();
    config.api = Object.assign({}, config.api, {
        originalApiPath: config.api && config.api.apiPath,
        apiPath: "/api",
        publicApiPath: "/public-api"
    });

    send(res, 200, JSON.stringify(config, null, 2), {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
}

function serveStatic(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
    const pathname = decodeURIComponent(requestUrl.pathname);
    const requestedPath = pathname === "/" ? "/Content_Login.html" : pathname;
    const filePath = path.resolve(rootDir, `.${requestedPath}`);

    if (!filePath.startsWith(rootDir + path.sep) && filePath !== rootDir) {
        send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
        return;
    }

    fs.stat(filePath, (statError, stat) => {
        if (statError || !stat.isFile()) {
            send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            "Content-Type": mimeTypes[ext] || "application/octet-stream",
            "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=60"
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

function proxyApi(req, res, proxyPrefix, rewriteAuthentication) {
    let targetApiUrl;

    try {
        targetApiUrl = getTargetAppUrl();
    } catch (error) {
        send(res, 500, error.message, { "Content-Type": "text/plain; charset=utf-8" });
        return;
    }

    const incomingUrl = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
    const apiPath = incomingUrl.pathname.replace(new RegExp(`^${proxyPrefix}`), "");
    const targetBasePath = targetApiUrl.pathname.replace(/\/$/, "");
    const targetPath = targetBasePath + apiPath + incomingUrl.search;
    const headers = Object.assign({}, req.headers, {
        "accept-encoding": "identity",
        host: targetApiUrl.host,
        origin: targetApiUrl.origin,
        referer: targetApiUrl.origin + "/"
    });

    delete headers["content-length"];
    delete headers["apiKey"];
    delete headers["apikey"];

    const proxyReq = (targetApiUrl.protocol === "https:" ? require("https") : require("http")).request({
        protocol: targetApiUrl.protocol,
        hostname: targetApiUrl.hostname,
        port: targetApiUrl.port || (targetApiUrl.protocol === "https:" ? 443 : 80),
        method: req.method,
        path: targetPath,
        headers
    }, (proxyRes) => {
        const responseHeaders = Object.assign({}, proxyRes.headers, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "APIKey, Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        });

        res.writeHead(proxyRes.statusCode || 502, responseHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on("error", (error) => {
        send(res, 502, `Proxy request failed: ${error.message}`, {
            "Content-Type": "text/plain; charset=utf-8"
        });
    });

    req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
        send(res, 204, "");
        return;
    }

    if (req.url === "/html_config.json" || req.url.startsWith("/html_config.json?")) {
        serveLocalConfig(res);
        return;
    }

    if (req.url.startsWith("/public-api/") || req.url === "/public-api") {
        proxyApi(req, res, "/public-api", true);
        return;
    }

    if (req.url.startsWith("/api/") || req.url === "/api") {
        proxyApi(req, res, "/api", false);
        return;
    }

    serveStatic(req, res);
});

server.listen(port, host, () => {
    console.log(`Local proxy server running at http://${host}:${port}/Content_Login.html`);
    console.log("Forwarding /api and /public-api requests to html_config.json api.baseUrl");
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop Live Server or run: $env:PORT=5501; node proxy-server.js`);
        return;
    }

    console.error(error);
});
