const { state } = require("../appState");
const { syncCurrentDocument, syncCurrentDocumentTimeSpent } = require("./document");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const UPDATE_CURRENT_DOCUMENT_INTERVAL = 500;
const UPDATE_CURRENT_DOCUMENT_TIME_SPENT_INTERVAL = 1000;

async function updateCurrentDocument() {
    let nextTick = Date.now();
    while (true) {
        try {
            await syncCurrentDocument();
        } catch (err) {
            state.logger.error("updateCurrentDocument", err);
        }
        nextTick += UPDATE_CURRENT_DOCUMENT_INTERVAL;
        const delay = nextTick - Date.now();
        if (delay > 0) {
            await sleep(delay);
        } else {
            // 执行时间超过间隔：不补历史债，直接从当前时刻重新对齐
            nextTick = Date.now();
        }
    }
}

async function updateCurrentDocumentTimeSpent() {
    let nextTick = Date.now();
    while (true) {
        try {
            await syncCurrentDocumentTimeSpent();
        } catch (err) {
            state.logger.error("updateCurrentDocumentTimeSpent", err);
        }
        nextTick += UPDATE_CURRENT_DOCUMENT_TIME_SPENT_INTERVAL;
        const delay = nextTick - Date.now();
        if (delay > 0) {
            await sleep(delay);
        } else {
            // 执行时间超过间隔：不补历史债，直接从当前时刻重新对齐
            nextTick = Date.now();
        }
    }
}

exports.updateCurrentDocument = updateCurrentDocument;
exports.updateCurrentDocumentTimeSpent = updateCurrentDocumentTimeSpent;

