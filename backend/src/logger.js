function formatError(err) {
    if (!err) return "Unknown error";
    if (err && err.stack) return err.stack;
    try {
        return JSON.stringify(err);
    } catch (e) {
        return String(err);
    }
}

function formatValue(value) {
    if (value === undefined) return "";
    if (value === null) return "null";
    if (typeof value === "string") return value;
    if (value && value.stack) return value.stack;
    try {
        return JSON.stringify(value);
    } catch (e) {
        return String(value);
    }
}

function nowIso() {
    try {
        return new Date().toISOString();
    } catch (e) {
        return String(Date.now());
    }
}

function emit(level, tag, message) {
    try {
        const { state } = require("./appState");
        if (state && state.logService && typeof state.logService.push === "function") {
            state.logService.push(level, tag, message);
        }
    } catch (e) {
        // ignore log service errors
    }
}

function normalizeArgs(a, b, c) {
    if (b === undefined && c === undefined) {
        return { tag: "app", message: formatValue(a) };
    }
    if (c === undefined) {
        return { tag: String(a), message: formatValue(b) };
    }
    const head = formatValue(b);
    const tail = formatValue(c);
    return { tag: String(a), message: tail ? `${head}\n${tail}` : head };
}

function error(tag, err, extra) {
    const prefix = `[F_Record][${tag}][${nowIso()}]`;
    if (extra) {
        try {
            console.error(prefix, extra);
        } catch (e) {
            // ignore
        }
    }
    const errText = formatError(err);
    console.error(prefix, errText);
    const message = extra ? `${formatValue(extra)}\n${errText}` : errText;
    emit("error", tag, message);
}

function info(a, b, c) {
    const payload = normalizeArgs(a, b, c);
    const prefix = `[F_Record][${payload.tag}][${nowIso()}]`;
    console.log(prefix, payload.message);
    emit("info", payload.tag, payload.message);
}

function warn(a, b, c) {
    const payload = normalizeArgs(a, b, c);
    const prefix = `[F_Record][${payload.tag}][${nowIso()}]`;
    console.warn(prefix, payload.message);
    emit("warn", payload.tag, payload.message);
}

function log(a, b, c) {
    info(a, b, c);
}

let processHandlersRegistered = false;

function registerProcessErrorHandlers() {
    if (processHandlersRegistered) return;
    processHandlersRegistered = true;

    process.on("uncaughtException", function (err) {
        error("uncaughtException", err);
    });

    process.on("unhandledRejection", function (reason) {
        error("unhandledRejection", reason);
    });
}

exports.error = error;
exports.info = info;
exports.warn = warn;
exports.log = log;
exports.registerProcessErrorHandlers = registerProcessErrorHandlers;

