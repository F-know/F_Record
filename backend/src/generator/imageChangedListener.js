const { state } = require("../appState");
const fs = require("fs");
const path = require("path");
const { getDocumentImageByDocumentId } = require("./document");

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

function createImageChangedListener() {
    return async function imageChangedListener(changedEvent) {
        try {
            await handleImageChanged(changedEvent);
        } catch (err) {
            state.logger.error("imageChangedListener", err);
        }
    };
}

async function handleImageChanged(changedEvent) {
    const currentDocumentId = state.runtime.currentDocumentId;
    const currentDocumentUid = state.runtime.currentDocumentUid;

    state.logger.info("needSaveImage", {
        currentDocumentId,
        currentDocumentUid,
        changedEvent,
    });

    if (!needSaveImage(changedEvent, currentDocumentId, currentDocumentUid)) return;

    state.runtime.isGettingAndSavingImage = true;
    try {
        const image = await getDocumentImageByDocumentId(currentDocumentId);
        await saveImage(image, currentDocumentUid);

        if (!state.runtime.lastSavedImageTimeMsByUid) {
            state.runtime.lastSavedImageTimeMsByUid = {};
        }
        state.runtime.lastSavedImageTimeMsByUid[currentDocumentUid] = Date.now();
    } catch (err) {
        state.logger.error("getAndSaveImage", err);
    } finally {
        state.runtime.isGettingAndSavingImage = false;
    }
}

function needSaveImage(changedEvent, currentDocumentId, currentDocumentUid) {
    if (!currentDocumentUid) return false;
    if (state.runtime.isGettingAndSavingImage) return false;

    const configData = state.configService.getConfigData();
    if (!configData.isEnabled) {
        return false;
    }
    const changedDocumentId = changedEvent.id || changedEvent.documentID;
    if (changedDocumentId !== currentDocumentId) {
        return false;
    }
    if (changedEvent.metaDataOnly === true) {
        return false;
    }
    if (!changedEvent.layers || changedEvent.layers.length === 0) {
        return false;
    }
    if (
        changedEvent.layers.some((layer) =>
            Object.prototype.hasOwnProperty.call(layer, "visible")
        )
    ) {
        return false;
    }

    const minIntervalSeconds = Number(configData.minSaveIntervalSeconds) || 0;
    if (minIntervalSeconds > 0) {
        const lastMap = state.runtime.lastSavedImageTimeMsByUid || {};
        const lastMs = lastMap[currentDocumentUid] || 0;
        const nowMs = Date.now();
        if (nowMs - lastMs < minIntervalSeconds * 1000) {
            return false;
        }
    }
    return true;
}

async function saveImage(image, documentUid) {
    const configData = state.configService.getConfigData();
    const documentsRepo = state.db.documentsRepo;

    const row = await documentsRepo.getDocument(documentUid);
    if (!row) {
        const err = new Error(`document row not found: uid=${documentUid}`);
        err.code = "DOCUMENT_ROW_NOT_FOUND";
        throw err;
    }
    let processImageCount = row.processImageCount;
    if (processImageCount === undefined || processImageCount === null) {
        processImageCount = 0;
    }
    const nextCount = processImageCount + 1;

    const documentFolderPath = path.join(configData.processImageFolderPath, documentUid);
    if (!fs.existsSync(documentFolderPath)) {
        ensureDirSync(documentFolderPath);
    }

    const imageName = `${pad(nextCount, 7)}.jpg`;
    const imageFilePath = path.join(documentFolderPath, imageName);

    await image.quality(configData.processImageQuality).writeAsync(imageFilePath);
    await documentsRepo.updateDocument(documentUid, {
        processImageCount: nextCount,
        lastChangedTime: Date.now(),
    });
}

function pad(num, size) {
    let s = String(num);
    while (s.length < size) {
        s = "0" + s;
    }
    return s;
}


exports.createImageChangedListener = createImageChangedListener;

