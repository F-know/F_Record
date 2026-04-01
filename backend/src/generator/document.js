const uuidv4 = require("uuid/v4");

const { state } = require("../appState");
const { APP_NAME } = require("../constants");
const { getPixmapAndImageSettings } = require("./pixmap");
const { pixmapToJimpImage } = require("./pixmapToJimpImage");

async function getCurrentDocumentUid(currentDocumentId) {
    const currentDocumentSettingsForPlugin =
        await state.generatorInstance.getDocumentSettingsForPlugin(currentDocumentId, APP_NAME);
    if (!currentDocumentSettingsForPlugin) {
        throw new Error("currentDocumentSettingsForPlugin not found");
    }
    let currentDocumentUid =
        currentDocumentSettingsForPlugin &&
        currentDocumentSettingsForPlugin.documentUid !== undefined
            ? currentDocumentSettingsForPlugin.documentUid
            : null;
    if (currentDocumentUid != null) {
        return currentDocumentUid;
    }
    currentDocumentUid = uuidv4();
    currentDocumentSettingsForPlugin.documentUid = currentDocumentUid;
    await state.generatorInstance.setDocumentSettingsForPlugin(currentDocumentSettingsForPlugin, APP_NAME);
    return currentDocumentUid;
}


async function getDocumentImageByDocumentId(documentId) {
    const result = await getPixmapAndImageSettings(documentId);
    return await pixmapToJimpImage(result.pixmap, result.imageSettings);
}

exports.getDocumentImageByDocumentId = getDocumentImageByDocumentId;
exports.getCurrentDocumentUid = getCurrentDocumentUid;
