const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { createConfigApi } = require("./api/config");
const { createDocumentApi } = require("./api/document");
const { createFsApi } = require("./api/fs");
const { createLogApi } = require("./api/log");
const { createTimelapseApi } = require("./api/timelapse");
const { state } = require("./appState");
const logger = require("./logger");
const { openUrl } = require("./openBrowser");

const DEFAULT_PORT = 3721;
const PORT_ENV = "F_RECORD_PORT";
const USE_EMBEDDED_UI_ENV = "F_RECORD_USE_EMBEDDED_UI";
const FRONTEND_DIST_DIRNAME = "frontend-dist";

let httpServer = null;
let hasOpenedUi = false;

function resolveFrontendDistDir() {
    return path.resolve(__dirname, "..", FRONTEND_DIST_DIRNAME);
}

function isEmbeddedUiAvailable(frontendDistDir) {
    try {
        return fs.existsSync(path.join(frontendDistDir, "index.html"));
    } catch (err) {
        return false;
    }
}

function readBoolEnv(name, defaultValue) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === "") return defaultValue;
    const v = String(raw).toLowerCase().trim();
    if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
    if (v === "0" || v === "false" || v === "no" || v === "off") return false;
    return defaultValue;
}

function startHttpServer() {
    if (httpServer) return httpServer;

    const portFromEnv = process.env[PORT_ENV] ? Number(process.env[PORT_ENV]) : null;
    const port = Number.isFinite(portFromEnv) ? portFromEnv : DEFAULT_PORT;

    const app = express();
    app.disable("x-powered-by");
    app.use(cors());
    app.use(express.json({ limit: "1mb" }));

    app.get("/health", (req, res) => {
        res.status(200).json({ ok: true });
    });

    app.use("/api", createDocumentApi());
    app.use("/api", createConfigApi());
    app.use("/api", createFsApi());
    app.use("/api", createLogApi());
    app.use("/api", createTimelapseApi());

    const frontendDistDir = resolveFrontendDistDir();
    const uiAvailable = isEmbeddedUiAvailable(frontendDistDir);
    const useEmbeddedUi = readBoolEnv(USE_EMBEDDED_UI_ENV, true);
    if (uiAvailable && useEmbeddedUi) {
        app.use(express.static(frontendDistDir));
        app.get("*", (req, res, next) => {
            if (req.path && req.path.indexOf("/api") === 0) return next();
            if (req.method !== "GET") return next();
            return res.sendFile(path.join(frontendDistDir, "index.html"));
        });
    }

    // 兜底 404
    app.use((req, res) => {
        res.status(404).type("text/plain").send("Not Found");
    });

    app.use((err, req, res, next) => {
        logger.error("express", err, { method: req.method, url: req.originalUrl || req.url });
        res.status(500).json({ ok: false, message: "服务器内部错误" });
    });

    httpServer = app.listen(port, "127.0.0.1", () => {
        const baseUrl = `http://127.0.0.1:${port}`;
        logger.info("httpServer", `http listening on ${baseUrl}`);

        const configService = state.configService;
        const openUi = !!(configService && configService.getConfigData && configService.getConfigData().openUi);

        if (uiAvailable && useEmbeddedUi && openUi && !hasOpenedUi) {
            hasOpenedUi = true;
            openUrl(baseUrl);
        }
    });

    return httpServer;
}

function stopHttpServer() {
    if (!httpServer) return Promise.resolve();

    const serverToClose = httpServer;
    httpServer = null;

    return new Promise((resolve) => {
        serverToClose.close(() => resolve());
    });
}

exports.startHttpServer = startHttpServer;
exports.stopHttpServer = stopHttpServer;

