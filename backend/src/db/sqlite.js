const fs = require("fs");
const path = require("path");

// Node v8 兼容：TextDecoder/TextEncoder 可能不在 global 上
try {
    const util = require("util");
    if (typeof global.TextDecoder === "undefined" && util.TextDecoder) {
        global.TextDecoder = util.TextDecoder;
    }
    if (typeof global.TextEncoder === "undefined" && util.TextEncoder) {
        global.TextEncoder = util.TextEncoder;
    }
} catch (err) {
    // ignore
}

const initSqlJs = require("sql.js");

function mkdirpSync(dirPath) {
    if (!dirPath) return;
    if (fs.existsSync(dirPath)) return;
    mkdirpSync(path.dirname(dirPath));
    try {
        fs.mkdirSync(dirPath);
    } catch (err) {
        // ignore (race)
    }
}

function readFileAsync(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) return reject(err);
            return resolve(data);
        });
    });
}

function writeFileAsync(filePath, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, (err) => {
            if (err) return reject(err);
            return resolve();
        });
    });
}

function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        return false;
    }
}

function queryAll(db, sql, params) {
    const stmt = db.prepare(sql, params || []);
    const rows = [];
    try {
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
    } finally {
        stmt.free();
    }
    return rows;
}

function queryOne(db, sql, params) {
    const rows = queryAll(db, sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function getTableColumns(db, tableName) {
    const rows = queryAll(db, `PRAGMA table_info(${tableName});`, []);
    return rows.map((r) => r.name);
}

function ensureDocumentsSchema(db, logger) {
    // 开发阶段不做迁移：结构不对就直接重建
    db.run(
        "CREATE TABLE IF NOT EXISTS documents (uid TEXT PRIMARY KEY, filePath TEXT, processImageCount INTEGER NOT NULL DEFAULT 0, lastChangedTime INTEGER, creationTime INTEGER, timeSpent INTEGER NOT NULL DEFAULT 0);"
    );

    const columns = getTableColumns(db, "documents");
    if (
        columns.indexOf("uid") >= 0 &&
        columns.indexOf("filePath") >= 0 &&
        columns.indexOf("processImageCount") >= 0 &&
        columns.indexOf("lastChangedTime") >= 0 &&
        columns.indexOf("creationTime") >= 0 &&
        columns.indexOf("timeSpent") >= 0
    ) {
        return;
    }

    // 直接丢弃旧表数据（开发测试阶段允许）
    db.run("DROP TABLE IF EXISTS documents;");
    db.run(
        "CREATE TABLE IF NOT EXISTS documents (uid TEXT PRIMARY KEY, filePath TEXT, processImageCount INTEGER NOT NULL DEFAULT 0, lastChangedTime INTEGER, creationTime INTEGER, timeSpent INTEGER NOT NULL DEFAULT 0);"
    );

    if (logger && typeof logger.warn === "function") {
        logger.warn("[db] reset documents schema to (uid, filePath, processImageCount, lastChangedTime, creationTime, timeSpent)");
    } else if (logger && typeof logger.log === "function") {
        logger.log("[db] reset documents schema to (uid, filePath, processImageCount, lastChangedTime, creationTime, timeSpent)");
    }
}

let sqlModulePromise = null;
function getSqlModule() {
    if (sqlModulePromise) return sqlModulePromise;

    // sql.js 需要 locateFile 才能在 Node 环境找到 wasm
    const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
    const wasmDir = path.dirname(wasmPath);

    sqlModulePromise = initSqlJs({
        locateFile: function (file) {
            return path.join(wasmDir, file);
        },
    });

    return sqlModulePromise;
}

let dbPromise = null;

async function openDatabase({ filename, logger }) {
    mkdirpSync(path.dirname(filename));

    const SQL = await getSqlModule();

    let db = null;
    if (fileExists(filename)) {
        const buf = await readFileAsync(filename);
        db = new SQL.Database(new Uint8Array(buf));
    } else {
        db = new SQL.Database();
    }

    ensureDocumentsSchema(db, logger);

    if (logger && typeof logger.log === "function") {
        logger.log(`[db] sqlite opened: ${filename}`);
    }

    return {
        db,
        filename,
        async save() {
            const data = db.export(); // Uint8Array
            await writeFileAsync(filename, Buffer.from(data));
        },
        close() {
            try {
                db.close();
            } catch (err) {
                // ignore
            }
        },
    };
}

function getDatabase({ filename, logger }) {
    if (dbPromise) return dbPromise;
    dbPromise = openDatabase({ filename, logger });
    return dbPromise;
}

exports.getDatabase = getDatabase;

