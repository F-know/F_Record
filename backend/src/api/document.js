const express = require("express");
const fs = require("fs");
const path = require("path");
const { state } = require("../appState");
const { openPath } = require("../openBrowser");

function toIntOrUndefined(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (Number.isFinite(n)) return Math.trunc(n);
    }
    return undefined;
}

function parseJsonOrNull(value) {
    if (!value || typeof value !== "string") return null;
    try {
        return JSON.parse(value);
    } catch (err) {
        return null;
    }
}

function createDocumentApi() {
    const router = express.Router();

    router.get("/currentDocumentInfo", async (req, res) => {
        try {
            if (!state.runtime || !state.db || !state.db.documentsRepo) {
                return res.status(503).json({ ok: false, message: "服务尚未就绪" });
            }

            const currentDocumentId = state.runtime.currentDocumentId;
            const currentDocumentUid = state.runtime.currentDocumentUid;
            const pendingSeconds =
                currentDocumentUid && state.runtime.pendingTimeSpentSecondsByUid
                    ? state.runtime.pendingTimeSpentSecondsByUid[currentDocumentUid] || 0
                    : 0;

            const result = {
                currentDocumentId,
                currentDocumentUid,
                pendingTimeSpentSeconds: pendingSeconds,
                document: null,
            };

            if (!currentDocumentUid) {
                return res.status(200).json(result);
            }

            const row = await state.db.documentsRepo.getDocument(currentDocumentUid);
            result.document = row;
            return res.status(200).json(result);
        } catch (err) {
            state.logger.error("api:currentDocumentInfo", err);
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.get("/documentInfoList", async (req, res) => {
        try {
            if (!state.db || !state.db.documentsRepo) {
                return res.status(503).json({ ok: false, message: "服务尚未就绪" });
            }

            const page = toIntOrUndefined(req.query.page);
            const pageSize = toIntOrUndefined(req.query.pageSize);
            let orderBy = req.query.orderBy ? String(req.query.orderBy) : undefined;
            let orderDir = req.query.orderDir ? String(req.query.orderDir) : undefined;

            let filter = {};
            const filterJson = parseJsonOrNull(req.query.filter);
            if (filterJson && typeof filterJson === "object" && !Array.isArray(filterJson)) {
                filter = filterJson;
            }

            // 允许用简单 query 作为快捷筛选（会覆盖 filter 里的同名字段）
            if (req.query.uid !== undefined) filter.uid = String(req.query.uid);
            if (req.query.filePath !== undefined) filter.filePath = String(req.query.filePath);

            const creationTimeFrom = toIntOrUndefined(req.query.creationTimeFrom);
            const creationTimeTo = toIntOrUndefined(req.query.creationTimeTo);
            const lastChangedTimeFrom = toIntOrUndefined(req.query.lastChangedTimeFrom);
            const lastChangedTimeTo = toIntOrUndefined(req.query.lastChangedTimeTo);
            const processImageCountFrom = toIntOrUndefined(req.query.processImageCountFrom);
            const processImageCountTo = toIntOrUndefined(req.query.processImageCountTo);
            const timeSpentFrom = toIntOrUndefined(req.query.timeSpentFrom);
            const timeSpentTo = toIntOrUndefined(req.query.timeSpentTo);

            const filePathLike = req.query.filePathLike ? String(req.query.filePathLike) : undefined;

            // 无参数默认：按 lastChangedTime（更新时间）降序
            if (!orderBy) orderBy = "lastChangedTime";
            if (!orderDir) orderDir = "DESC";

            const result = await state.db.documentsRepo.listDocuments({
                filter,
                page: page !== undefined ? page : undefined,
                pageSize: pageSize !== undefined ? pageSize : undefined,
                orderBy,
                orderDir,
                creationTimeFrom,
                creationTimeTo,
                lastChangedTimeFrom,
                lastChangedTimeTo,
                processImageCountFrom,
                processImageCountTo,
                timeSpentFrom,
                timeSpentTo,
                filePathLike,
            });
            return res.status(200).json(result);
        } catch (err) {
            state.logger.error("api:documentInfoList", err);
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.post("/document/openProcessImageFolder", async (req, res) => {
        try {
            if (!state.db || !state.db.documentsRepo || !state.configService) {
                return res.status(503).json({ ok: false, message: "服务尚未就绪" });
            }

            const uid = req.body && req.body.uid ? String(req.body.uid) : "";
            if (!uid.trim()) {
                return res.status(400).json({ ok: false, message: "uid 不能为空" });
            }

            const row = await state.db.documentsRepo.getDocument(uid);
            if (!row) {
                return res.status(404).json({ ok: false, message: "文档不存在" });
            }

            const configData = state.configService.getConfigData();
            const folderPath = path.join(configData.processImageFolderPath, uid);
            if (!fs.existsSync(folderPath)) {
                return res.status(404).json({ ok: false, message: "过程图片文件夹不存在" });
            }

            openPath(folderPath);
            return res.status(200).json({ ok: true, path: folderPath });
        } catch (err) {
            state.logger.error("api:openProcessImageFolder", err);
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    return router;
}

exports.createDocumentApi = createDocumentApi;

