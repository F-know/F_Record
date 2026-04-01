const express = require("express");
const logger = require("../logger");
const { state } = require("../appState");

function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function createConfigApi() {
    const router = express.Router();

    router.get("/config", (req, res) => {
        const configService = state.configService;
        if (!configService) return res.status(503).json({ ok: false, message: "配置尚未就绪" });

        const doc = configService.getConfigDoc();
        res.status(200).json({ config: doc.data, version: doc.version, configPath: configService.getConfigPath() });
    });

    router.put("/config", (req, res) => {
        try {
            const configService = state.configService;
            if (!configService) return res.status(503).json({ ok: false, message: "配置尚未就绪" });

            const body = req.body;
            if (!isPlainObject(body)) {
                return res.status(400).json({ ok: false, message: "Body 必须是 JSON 对象" });
            }

            const nextData = configService.replaceConfigData(body);
            return res.status(200).json({ ok: true, config: nextData });
        } catch (err) {
            logger.error("api:put_config", err);
            if (err && err.code === "CONFIG_SCHEMA_VALIDATION_FAILED") {
                return res.status(400).json({ ok: false, message: err.message, details: err.details });
            }
            if (err && err.code === "INVALID_CONFIG_DATA") {
                return res.status(400).json({ ok: false, message: err.message });
            }
            if (err && err.code === "INVALID_IGNORED_LAYER_NAME_PATTERN") {
                return res.status(400).json({ ok: false, message: err.message });
            }
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.patch("/config", (req, res) => {
        try {
            const configService = state.configService;
            if (!configService) return res.status(503).json({ ok: false, message: "配置尚未就绪" });

            const body = req.body;
            if (!isPlainObject(body)) {
                return res.status(400).json({ ok: false, message: "Body 必须是 JSON 对象" });
            }

            const nextData = configService.patchConfigData(body);
            return res.status(200).json({ ok: true, config: nextData });
        } catch (err) {
            logger.error("api:patch_config", err);
            if (err && err.code === "CONFIG_SCHEMA_VALIDATION_FAILED") {
                return res.status(400).json({ ok: false, message: err.message, details: err.details });
            }
            if (err && err.code === "INVALID_CONFIG_PATCH") {
                return res.status(400).json({ ok: false, message: err.message });
            }
            if (err && err.code === "INVALID_IGNORED_LAYER_NAME_PATTERN") {
                return res.status(400).json({ ok: false, message: err.message });
            }
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.post("/config/set", (req, res) => {
        try {
            const configService = state.configService;
            if (!configService) return res.status(503).json({ ok: false, message: "配置尚未就绪" });

            const body = req.body;
            if (!isPlainObject(body) || typeof body.path !== "string") {
                return res.status(400).json({ ok: false, message: "Body 需要包含字符串字段 path" });
            }

            const nextData = configService.setConfigDataByPath(body.path, body.value);
            return res.status(200).json({ ok: true, config: nextData });
        } catch (err) {
            logger.error("api:post_config_set", err);
            if (err && err.code === "CONFIG_SCHEMA_VALIDATION_FAILED") {
                return res.status(400).json({ ok: false, message: err.message, details: err.details });
            }
            if (err && err.code === "INVALID_PATH") {
                return res.status(400).json({ ok: false, message: err.message });
            }
            if (err && err.code === "INVALID_IGNORED_LAYER_NAME_PATTERN") {
                return res.status(400).json({ ok: false, message: err.message });
            }
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    return router;
}

exports.createConfigApi = createConfigApi;

