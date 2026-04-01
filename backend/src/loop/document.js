const { state } = require("../appState");
const { getCurrentDocumentUid } = require("../generator/document");

async function syncCurrentDocument() {
    let documentInfo = null;
    try {
        documentInfo = await state.generatorInstance.getDocumentInfo();
    } catch (err) {
        return;
    }

    const currentDocumentId = documentInfo && documentInfo.id !== undefined ? documentInfo.id : null;
    if (currentDocumentId == null) {
        state.runtime.currentDocumentId = null;
        state.runtime.currentDocumentUid = null;
        return;
    }
    
    const currentDocumentUid = await getCurrentDocumentUid(currentDocumentId);

    const filePath = documentInfo.file;
    const documentsRepo = state.db.documentsRepo;

    const row = await documentsRepo.getDocument(currentDocumentUid);
    if (!row) {
        await documentsRepo.createDocument({
            uid: currentDocumentUid,
            filePath: filePath,
            creationTime: Date.now(),
        });
    } else {
        if (row.filePath !== filePath) {
            await documentsRepo.updateDocument(currentDocumentUid, { filePath });
        }
    }

    state.runtime.currentDocumentId = currentDocumentId;
    state.runtime.currentDocumentUid = currentDocumentUid;
}

async function syncCurrentDocumentTimeSpent() {
    const configData = state.configService.getConfigData();
    if (!configData.isEnabled) {
        return;
    }

    const uid = state.runtime.currentDocumentUid;
    if (!uid) {
        return;
    }

    const row = await state.db.documentsRepo.getDocument(uid);
    if (!row) {
        return;
    }

    if (row.lastChangedTime === null || row.lastChangedTime === undefined) {
        return;
    }

    const idleTimeoutMinutes = configData.idleTimeout;
    const now = Date.now();
    if (idleTimeoutMinutes !== 0) {
        const deadline = row.lastChangedTime + idleTimeoutMinutes * 60 * 1000;
        if (deadline < now) {
            return;
        }
    }

    const pendingByUid = state.runtime.pendingTimeSpentSecondsByUid;
    let pendingSeconds = pendingByUid[uid] || 0;
    pendingSeconds += 1;

    if (pendingSeconds < 60) {
        pendingByUid[uid] = pendingSeconds;
        return;
    }

    const minutesToAdd = Math.floor(pendingSeconds / 60);
    pendingByUid[uid] = pendingSeconds % 60;

    const timeSpent = row.timeSpent || 0;
    await state.db.documentsRepo.updateDocument(uid, { timeSpent: timeSpent + minutesToAdd });
}

exports.syncCurrentDocument = syncCurrentDocument;
exports.syncCurrentDocumentTimeSpent = syncCurrentDocumentTimeSpent;

