const Ajv = require("ajv");

const { configDocSchema, createDefaultConfigDoc, CURRENT_CONFIG_VERSION } = require("./schema");
const { state } = require("../appState");
const { createConfigStore } = require("./store");

function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function setByDotPath(target, dotPath, value) {
    if (!dotPath || typeof dotPath !== "string") return false;
    const keys = dotPath.split(".").filter(Boolean);
    if (keys.length === 0) return false;

    let cursor = target;
    for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        if (!isPlainObject(cursor[key])) cursor[key] = {};
        cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]] = value;
    return true;
}

function createValidator() {
    const ajv = new Ajv({
        allErrors: true,
        useDefaults: false,
        removeAdditional: false,
    });
    return ajv.compile(configDocSchema);
}

function validateBusinessRules(data) {
    if (!data || typeof data !== "object") return;

    if (
        Object.prototype.hasOwnProperty.call(data, "ignoredLayerNamePattern") &&
        typeof data.ignoredLayerNamePattern === "string" &&
        data.ignoredLayerNamePattern !== ""
    ) {
        try {
            new RegExp(data.ignoredLayerNamePattern);
        } catch (err) {
            const regexErr = new Error("ignoredLayerNamePattern 不是合法的正则表达式");
            regexErr.code = "INVALID_IGNORED_LAYER_NAME_PATTERN";
            throw regexErr;
        }
    }
}

function createConfigService(options) {
    const store = (options && options.store) ? options.store : createConfigStore();
    const validateDoc = createValidator();

    const logger = state.logger;

    function getConfigPath() {
        return store && store.path ? store.path : null;
    }

    let cachedDoc = null;

    function resetToDefaultDoc(reason) {
        const defaults = createDefaultConfigDoc();
        store.store = defaults; // 落盘
        cachedDoc = defaults;
        if (logger && typeof logger.warn === "function") {
            logger.warn(`config:reset_to_default (${reason})`);
        } else if (logger && typeof logger.log === "function") {
            logger.log(`config:reset_to_default (${reason})`);
        }
        return defaults;
    }

    function loadFromDiskToCacheOnce() {
        // conf 的 store getter 每次都会 readFileSync，所以这里只允许启动时走一次
        const raw = store.store;
        if (!raw || !isPlainObject(raw)) {
            return resetToDefaultDoc("empty_or_not_object");
        }
        if (!Object.prototype.hasOwnProperty.call(raw, "version") || !Object.prototype.hasOwnProperty.call(raw, "data")) {
            return resetToDefaultDoc("missing_version_or_data");
        }
        if (!Number.isFinite(raw.version) || raw.version !== CURRENT_CONFIG_VERSION) {
            return resetToDefaultDoc("version_mismatch");
        }
        if (!isPlainObject(raw.data)) {
            return resetToDefaultDoc("data_not_object");
        }

        const doc = { version: raw.version, data: raw.data };
        const ok = validateDoc(doc);
        if (!ok) {
            if (logger && typeof logger.error === "function") {
                logger.error("config:invalid_on_load", new Error("配置文件不符合规范"), validateDoc.errors);
            }
            return resetToDefaultDoc("schema_validation_failed");
        }

        cachedDoc = doc;
        return doc;
    }

    // 初始化：读盘一次并缓存
    loadFromDiskToCacheOnce();

    function getConfigDoc() {
        return cloneJson(cachedDoc);
    }

    function getConfigData() {
        return cloneJson(cachedDoc.data);
    }

    function replaceConfigData(nextData) {
        if (!isPlainObject(nextData)) {
            const err = new Error("config 必须是 JSON 对象");
            err.code = "INVALID_CONFIG_DATA";
            throw err;
        }

        const nextDoc = {
            version: CURRENT_CONFIG_VERSION,
            data: cloneJson(nextData),
        };
        const ok = validateDoc(nextDoc);
        if (!ok) {
            const err = new Error("config 校验失败");
            err.code = "CONFIG_SCHEMA_VALIDATION_FAILED";
            err.details = validateDoc.errors;
            throw err;
        }
        validateBusinessRules(nextDoc.data);
        store.store = nextDoc; // 落盘
        cachedDoc = nextDoc;
        return cloneJson(nextDoc.data);
    }

    function patchConfigData(patch) {
        if (!isPlainObject(patch)) {
            const err = new Error("patch 必须是 JSON 对象");
            err.code = "INVALID_CONFIG_PATCH";
            throw err;
        }

        const nextData = Object.assign({}, cachedDoc.data, cloneJson(patch));
        return replaceConfigData(nextData);
    }

    function setConfigDataByPath(dotPath, value) {
        const nextData = cloneJson(cachedDoc.data);
        const okSet = setByDotPath(nextData, dotPath, value);
        if (!okSet) {
            const err = new Error("path 无效");
            err.code = "INVALID_PATH";
            throw err;
        }
        return replaceConfigData(nextData);
    }

    return {
        getConfigPath,
        getConfigDoc,
        getConfigData,
        replaceConfigData,
        patchConfigData,
        setConfigDataByPath,
    };
}

exports.createConfigService = createConfigService;

