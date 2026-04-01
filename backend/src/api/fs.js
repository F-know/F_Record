const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const logger = require("../logger");

function safeString(v) {
    if (v === undefined || v === null) return "";
    return String(v);
}

function listWindowsRoots() {
    const roots = [];
    for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code);
        const rootPath = `${letter}:\\`;
        try {
            if (fs.existsSync(rootPath)) {
                roots.push({ name: rootPath, path: rootPath });
            }
        } catch (err) {
            // ignore
        }
    }
    return roots;
}

function uniqueByPath(items) {
    const seen = {};
    const out = [];
    for (let i = 0; i < items.length; i++) {
        const p = items[i] && items[i].path ? items[i].path : "";
        if (!p) continue;
        if (seen[p]) continue;
        seen[p] = true;
        out.push(items[i]);
    }
    return out;
}

function listRoots() {
    const roots = [];
    const platform = process.platform;

    if (platform === "win32") {
        roots.push.apply(roots, listWindowsRoots());
        try {
            const home = os.homedir();
            if (home) roots.push({ name: "Home", path: home });
        } catch (err) {
            // ignore
        }
        return uniqueByPath(roots);
    }

    roots.push({ name: "/", path: "/" });
    try {
        const home = os.homedir();
        if (home) roots.push({ name: "Home", path: home });
    } catch (err) {
        // ignore
    }
    return uniqueByPath(roots);
}

function listDirs(dirPath) {
    const names = fs.readdirSync(dirPath);
    const dirs = [];

    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const childPath = path.join(dirPath, name);
        let st;
        try {
            st = fs.statSync(childPath);
        } catch (err) {
            continue;
        }
        if (!st || !st.isDirectory()) continue;
        dirs.push({ name, path: childPath });
    }

    dirs.sort((a, b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
    });

    return dirs;
}

function createFsApi() {
    const router = express.Router();

    router.get("/fs/roots", (req, res) => {
        try {
            const roots = listRoots();
            return res.status(200).json({ roots });
        } catch (err) {
            logger.error("api:fs_roots", err);
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    router.get("/fs/list", (req, res) => {
        try {
            const rawPath = safeString(req.query.path).trim();
            if (!rawPath) return res.status(400).json({ ok: false, message: "缺少 path 参数" });
            if (rawPath.indexOf("\0") >= 0) return res.status(400).json({ ok: false, message: "非法 path 参数" });

            let st;
            try {
                st = fs.statSync(rawPath);
            } catch (err) {
                return res.status(404).json({ ok: false, message: "路径不存在" });
            }
            if (!st || !st.isDirectory()) {
                return res.status(400).json({ ok: false, message: "path 不是文件夹" });
            }

            const dirs = listDirs(rawPath);
            return res.status(200).json({ path: rawPath, dirs });
        } catch (err) {
            logger.error("api:fs_list", err);
            return res.status(500).json({ ok: false, message: "服务器内部错误" });
        }
    });

    return router;
}

exports.createFsApi = createFsApi;

