const path = require("path");
const envPaths = require("env-paths");

const { APP_NAME } = require("../constants");

const DB_PATH_ENV = "F_RECORD_DB_PATH";
const DEFAULT_DB_FILENAME = "documents.sqlite";

function resolveDocumentsDbPath() {
    const configured = process.env[DB_PATH_ENV] || null;
    if (configured) {
        const resolved = path.resolve(configured);
        // 允许传目录：自动补文件名
        const ext = path.extname(resolved).toLowerCase();
        if (ext !== ".db" && ext !== ".sqlite") {
            return path.join(resolved, DEFAULT_DB_FILENAME);
        }
        return resolved;
    }

    const paths = envPaths(APP_NAME, { suffix: "" });
    return path.join(paths.data, "db", DEFAULT_DB_FILENAME);
}

exports.resolveDocumentsDbPath = resolveDocumentsDbPath;

