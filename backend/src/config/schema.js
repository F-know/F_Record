const CURRENT_CONFIG_VERSION = 1;

const path = require("path");
const envPaths = require("env-paths");

const { APP_NAME } = require("../constants");

function getDefaultProcessImageFolderPath() {
    const paths = envPaths(APP_NAME, { suffix: "" });
    return path.join(paths.data, "processImages");
}

const configDocSchema = {
    $id: "f_record_config_doc_v1",
    type: "object",
    additionalProperties: true,
    required: ["version", "data"],
    properties: {
        version: { type: "integer", minimum: 1 },
        data: {
            type: "object",
            additionalProperties: true,
            required: [
                "isEnabled",
                "processImageFolderPath",
                "processImageResolution",
                "processImageQuality",
                "idleTimeout",
                "language",
                "openUi",
            ],
            properties: {
                isEnabled: { type: "boolean" },
                processImageFolderPath: { type: "string" },
                ignoredLayerNamePattern: { type: "string" },
                processImageResolution: { type: "integer", minimum: 1 },
                processImageQuality: { type: "integer", minimum: 1, maximum: 100 },
                minSaveIntervalSeconds: { type: "integer", minimum: 0 },
                idleTimeout: { type: "integer", minimum: 0 },
                language: { type: "string" },
                openUi: { type: "boolean" },
                timelapse: {
                    type: "object",
                    additionalProperties: true,
                    required: ["defaultFps", "enableVisualGuide"],
                    properties: {
                        defaultFps: { type: "integer", minimum: 1 },
                        enableVisualGuide: { type: "boolean" },
                    },
                },
            },
        },
    },
};

function createDefaultConfigDoc() {
    return {
        version: CURRENT_CONFIG_VERSION,
        data: {
            isEnabled: false,
            processImageFolderPath: getDefaultProcessImageFolderPath(),
            ignoredLayerNamePattern: "-ignore$",
            processImageResolution: 1080,
            processImageQuality: 70,
            minSaveIntervalSeconds: 0,
            idleTimeout: 1,
            language: "cn",
            openUi: true,
            timelapse: {
                defaultFps: 30,
                enableVisualGuide: false,
            },
        },
    };
}

exports.CURRENT_CONFIG_VERSION = CURRENT_CONFIG_VERSION;
exports.configDocSchema = configDocSchema;
exports.createDefaultConfigDoc = createDefaultConfigDoc;

