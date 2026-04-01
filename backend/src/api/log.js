const express = require("express");
const { state } = require("../appState");

function toIntOrUndefined(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (Number.isFinite(n)) return Math.trunc(n);
    }
    return undefined;
}

function createLogApi() {
    const router = express.Router();

    router.get("/logs", function (req, res) {
        if (!state.logService) {
            return res.status(503).json({ ok: false, message: "日志服务尚未就绪" });
        }

        const limit = toIntOrUndefined(req.query.limit);
        const items = state.logService.getRecent(limit);
        return res.status(200).json({
            items,
            nextSeq: state.logService.getNextSeq(),
            logFilePath: state.logService.getLogFilePath(),
        });
    });

    router.get("/logs/stream", function (req, res) {
        if (!state.logService) {
            return res.status(503).json({ ok: false, message: "日志服务尚未就绪" });
        }

        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.write("retry: 3000\n\n");

        const since = toIntOrUndefined(req.query.since);
        const backlog = state.logService.getSince(since);
        for (let i = 0; i < backlog.length; i += 1) {
            res.write(`event: log\ndata: ${JSON.stringify(backlog[i])}\n\n`);
        }

        const unsubscribe = state.logService.subscribe(function (entry) {
            res.write(`event: log\ndata: ${JSON.stringify(entry)}\n\n`);
        });

        const heartbeat = setInterval(function () {
            res.write(": ping\n\n");
        }, 15000);

        req.on("close", function () {
            clearInterval(heartbeat);
            unsubscribe();
        });
    });

    return router;
}

exports.createLogApi = createLogApi;

