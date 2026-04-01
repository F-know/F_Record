function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
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

function createDocumentsRepo({ getDb }) {
    let columnsCache = null;
    function getColumns(conn) {
        if (columnsCache) return columnsCache;
        columnsCache = getTableColumns(conn.db, "documents");
        return columnsCache;
    }

    function pickKnownFields(columns, obj, options) {
        const out = {};
        const disallow = (options && options.disallow) || {};
        Object.keys(obj).forEach((k) => {
            if (disallow[k]) return;
            if (columns.indexOf(k) < 0) return;
            out[k] = obj[k];
        });
        return out;
    }

    async function createDocument(doc) {
        if (!isPlainObject(doc)) {
            const err = new Error("createDocument 参数必须是对象");
            err.code = "INVALID_PARAMS";
            throw err;
        }
        if (!isNonEmptyString(doc.uid)) {
            const err = new Error("uid 必须是非空字符串");
            err.code = "INVALID_UID";
            throw err;
        }

        const conn = await getDb();
        const columns = getColumns(conn);
        const data = pickKnownFields(columns, doc, null);

        const keys = Object.keys(data);
        if (keys.length === 0) {
            const err = new Error("没有可写入的字段");
            err.code = "NO_VALID_FIELDS";
            throw err;
        }

        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO documents (${keys.join(", ")}) VALUES (${placeholders});`;
        const params = keys.map((k) => data[k]);
        conn.db.run(sql, params);
        await conn.save();

        return await getDocument(doc.uid);
    }

    async function getDocument(uid) {
        if (!isNonEmptyString(uid)) {
            const err = new Error("uid 必须是非空字符串");
            err.code = "INVALID_UID";
            throw err;
        }
        const conn = await getDb();
        return queryOne(conn.db, "SELECT * FROM documents WHERE uid = ? LIMIT 1;", [
            uid,
        ]);
    }

    async function updateDocument(uid, patch) {
        if (!isNonEmptyString(uid)) {
            const err = new Error("uid 必须是非空字符串");
            err.code = "INVALID_UID";
            throw err;
        }
        if (!isPlainObject(patch)) {
            const err = new Error("updateDocument patch 必须是对象");
            err.code = "INVALID_PARAMS";
            throw err;
        }

        const conn = await getDb();
        const columns = getColumns(conn);
        const data = pickKnownFields(columns, patch, { disallow: { uid: true } });
        const keys = Object.keys(data);
        if (keys.length === 0) {
            const err = new Error("没有可更新的字段");
            err.code = "NO_VALID_FIELDS";
            throw err;
        }

        const setSql = keys.map((k) => `${k} = ?`).join(", ");
        const params = keys.map((k) => data[k]);
        params.push(uid);

        conn.db.run(`UPDATE documents SET ${setSql} WHERE uid = ?;`, params);
        await conn.save();

        return await getDocument(uid);
    }

    async function deleteDocument(uid) {
        if (!isNonEmptyString(uid)) {
            const err = new Error("uid 必须是非空字符串");
            err.code = "INVALID_UID";
            throw err;
        }
        const conn = await getDb();
        conn.db.run("DELETE FROM documents WHERE uid = ?;", [uid]);
        await conn.save();
        return { ok: true };
    }

    async function listDocuments(options) {
        const conn = await getDb();
        const columns = getColumns(conn);

        const opts = options || {};
        const filter = isPlainObject(opts.filter) ? opts.filter : {};

        let page = typeof opts.page === "number" ? opts.page : 1;
        let pageSize = typeof opts.pageSize === "number" ? opts.pageSize : 20;
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 1;
        if (pageSize > 200) pageSize = 200;
        const offset = (page - 1) * pageSize;

        const whereParts = [];
        const whereParams = [];
        Object.keys(filter).forEach((k) => {
            if (columns.indexOf(k) < 0) return;
            const v = filter[k];
            if (v === null) {
                whereParts.push(`${k} IS NULL`);
                return;
            }
            whereParts.push(`${k} = ?`);
            whereParams.push(v);
        });

        // range filters
        function addRange(field, fromValue, toValue) {
            if (columns.indexOf(field) < 0) return;
            if (typeof fromValue === "number" && Number.isFinite(fromValue)) {
                whereParts.push(`${field} >= ?`);
                whereParams.push(fromValue);
            }
            if (typeof toValue === "number" && Number.isFinite(toValue)) {
                whereParts.push(`${field} <= ?`);
                whereParams.push(toValue);
            }
        }

        addRange("creationTime", opts.creationTimeFrom, opts.creationTimeTo);
        addRange("lastChangedTime", opts.lastChangedTimeFrom, opts.lastChangedTimeTo);
        addRange("processImageCount", opts.processImageCountFrom, opts.processImageCountTo);
        addRange("timeSpent", opts.timeSpentFrom, opts.timeSpentTo);

        // fuzzy search (filePath)
        if (typeof opts.filePathLike === "string" && opts.filePathLike.trim() !== "") {
            if (columns.indexOf("filePath") >= 0) {
                whereParts.push("filePath LIKE ?");
                whereParams.push(`%${opts.filePathLike}%`);
            }
        }
        const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

        let orderBy = isNonEmptyString(opts.orderBy) ? opts.orderBy : "lastChangedTime";
        if (columns.indexOf(orderBy) < 0) orderBy = "lastChangedTime";
        let orderDir = isNonEmptyString(opts.orderDir) ? opts.orderDir.toUpperCase() : "DESC";
        if (orderDir !== "ASC" && orderDir !== "DESC") orderDir = "ASC";

        const totalRow = queryOne(
            conn.db,
            `SELECT COUNT(1) as total FROM documents ${whereSql};`,
            whereParams
        );
        const total = totalRow ? totalRow.total : 0;

        const items = queryAll(
            conn.db,
            `SELECT * FROM documents ${whereSql} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?;`,
            whereParams.concat([pageSize, offset])
        );

        return {
            items,
            total,
            page,
            pageSize,
        };
    }

    return {
        createDocument,
        getDocument,
        updateDocument,
        deleteDocument,
        listDocuments,
    };
}

exports.createDocumentsRepo = createDocumentsRepo;

