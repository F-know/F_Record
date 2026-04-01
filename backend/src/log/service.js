const fs = require("fs");
const path = require("path");
const envPaths = require("env-paths");

const { APP_NAME } = require("../constants");

const MAX_HISTORY = 500;
const MAX_LOG_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_LOG_FILE_COUNT = 5;

function ensureDirSync(dirPath) {
    if (!dirPath) return;
    if (fs.existsSync(dirPath)) return;
    ensureDirSync(path.dirname(dirPath));
    try {
        fs.mkdirSync(dirPath);
    } catch (err) {
        // ignore (race)
    }
}

function resolveLogFilePath() {
    const paths = envPaths(APP_NAME, { suffix: "" });
    const logDir = paths.log || path.join(paths.data, "logs");
    ensureDirSync(logDir);
    return path.join(logDir, "backend.log");
}

function getExistingFileSize(filePath) {
    try {
        const stat = fs.statSync(filePath);
        if (stat && stat.isFile()) return stat.size;
    } catch (err) {
        // ignore
    }
    return 0;
}

function resolveRotatedLogFilePath(logFilePath, index) {
    const dir = path.dirname(logFilePath);
    const ext = path.extname(logFilePath);
    const base = path.basename(logFilePath, ext);
    return path.join(dir, `${base}.${index}${ext}`);
}

function rotateLogFiles(logFilePath) {
    const oldestPath = resolveRotatedLogFilePath(logFilePath, MAX_LOG_FILE_COUNT);
    try {
        if (fs.existsSync(oldestPath)) {
            fs.unlinkSync(oldestPath);
        }
    } catch (err) {
        // ignore
    }

    for (let i = MAX_LOG_FILE_COUNT - 1; i >= 1; i -= 1) {
        const fromPath = resolveRotatedLogFilePath(logFilePath, i);
        const toPath = resolveRotatedLogFilePath(logFilePath, i + 1);
        try {
            if (fs.existsSync(fromPath)) {
                fs.renameSync(fromPath, toPath);
            }
        } catch (err) {
            // ignore
        }
    }

    try {
        if (fs.existsSync(logFilePath)) {
            fs.renameSync(logFilePath, resolveRotatedLogFilePath(logFilePath, 1));
        }
    } catch (err) {
        // ignore
    }
}

function createLogService() {
    let nextSeq = 1;
    const history = [];
    const listeners = [];
    const logFilePath = resolveLogFilePath();
    let currentLogFileSize = getExistingFileSize(logFilePath);

    function appendToFile(entry) {
        const line = JSON.stringify(entry) + "\n";
        const lineSize = Buffer.byteLength(line, "utf8");

        if (currentLogFileSize > 0 && currentLogFileSize + lineSize > MAX_LOG_FILE_SIZE_BYTES) {
            rotateLogFiles(logFilePath);
            currentLogFileSize = 0;
        }

        currentLogFileSize += lineSize;
        fs.appendFile(logFilePath, line, function () {
            // ignore file logging errors to avoid affecting main flow
        });
    }

    function notify(entry) {
        for (let i = 0; i < listeners.length; i += 1) {
            try {
                listeners[i](entry);
            } catch (err) {
                // ignore listener errors
            }
        }
    }

    function push(level, tag, message) {
        const entry = {
            seq: nextSeq,
            time: Date.now(),
            level: level || "info",
            tag: tag || "app",
            message: message === undefined || message === null ? "" : String(message),
        };
        nextSeq += 1;

        history.push(entry);
        if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
        }

        appendToFile(entry);
        notify(entry);
        return entry;
    }

    function getRecent(limit) {
        const n = Number(limit);
        const safeLimit = Number.isFinite(n) && n > 0 ? Math.min(Math.trunc(n), MAX_HISTORY) : 200;
        return history.slice(Math.max(history.length - safeLimit, 0));
    }

    function getSince(seq) {
        const n = Number(seq);
        if (!Number.isFinite(n)) return [];
        return history.filter(function (entry) {
            return entry.seq > n;
        });
    }

    function subscribe(listener) {
        listeners.push(listener);
        return function unsubscribe() {
            const idx = listeners.indexOf(listener);
            if (idx >= 0) listeners.splice(idx, 1);
        };
    }

    function getNextSeq() {
        return nextSeq;
    }

    function getLogFilePath() {
        return logFilePath;
    }

    return {
        push,
        getRecent,
        getSince,
        subscribe,
        getNextSeq,
        getLogFilePath,
    };
}

exports.createLogService = createLogService;

