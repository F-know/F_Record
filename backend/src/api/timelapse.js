const express = require("express");
const { state } = require("../appState");

function createTimelapseApi() {
    const router = express.Router();

    router.get("/timelapse/jobs", function (req, res) {
        try {
            if (!state.timelapseService) {
                return res.status(503).json({ ok: false, message: "服务尚未就绪" });
            }
            return res.status(200).json({ items: state.timelapseService.listJobs() });
        } catch (err) {
            state.logger.error("api:timelapse_jobs", err);
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.post("/timelapse/export", async function (req, res) {
        try {
            if (!state.timelapseService) {
                return res.status(503).json({ ok: false, message: "服务尚未就绪" });
            }

            const uid = req.body && req.body.uid ? String(req.body.uid) : "";
            const options = req.body && req.body.options && typeof req.body.options === "object"
                ? req.body.options
                : {};
            const job = await state.timelapseService.createExportJob(uid, options);
            return res.status(200).json({ ok: true, job: job });
        } catch (err) {
            state.logger.error("api:timelapse_export", err);
            if (
                err &&
                (err.code === "INVALID_UID" || err.code === "NO_TIMELAPSE_FRAMES")
            ) {
                return res.status(400).json({ ok: false, message: err.message });
            }
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.post("/timelapse/openOutputFolder", function (req, res) {
        try {
            if (!state.timelapseService) {
                return res.status(503).json({ ok: false, message: "服务尚未就绪" });
            }
            const jobId = req.body && req.body.jobId ? String(req.body.jobId) : "";
            const result = state.timelapseService.openOutputFolder(jobId);
            return res.status(200).json(result);
        } catch (err) {
            state.logger.error("api:timelapse_open_output_folder", err);
            if (
                err &&
                (err.code === "TIMELAPSE_JOB_NOT_FOUND" || err.code === "TIMELAPSE_OUTPUT_DIR_NOT_FOUND")
            ) {
                return res.status(400).json({ ok: false, message: err.message });
            }
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    return router;
}

exports.createTimelapseApi = createTimelapseApi;

