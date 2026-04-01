const { state } = require("../appState");
const { resolveDocumentsDbPath } = require("./paths");
const { getDatabase } = require("./sqlite");
const { createDocumentsRepo } = require("./repos/documentsRepo");

let documentsDbPromise = null;
let documentsRepo = null;

function getLogger() {
    return state.logger;
}

function getDocumentsDb() {
    if (documentsDbPromise) return documentsDbPromise;
    const filename = resolveDocumentsDbPath();
    documentsDbPromise = getDatabase({ filename, logger: getLogger() });
    return documentsDbPromise;
}

function initDb() {
    if (!documentsRepo) {
        documentsRepo = createDocumentsRepo({ getDb: getDocumentsDb });
    }
    return {
        documentsRepo,
    };
}

exports.initDb = initDb;

