const path = require("path");
const envPaths = require("env-paths");

const { APP_NAME } = require("../constants");

const CONFIG_PATH_ENV = "F_RECORD_CONFIG_PATH";
const DEFAULT_CONFIG_FILENAME = "config.json";

function resolveConfigFilePath() {
    const configuredPath = process.env[CONFIG_PATH_ENV] || null;
    if (configuredPath) {
        const resolved = path.resolve(configuredPath);
        // 允许传目录：自动补 config.json
        if (path.extname(resolved).toLowerCase() !== ".json") {
            return path.join(resolved, DEFAULT_CONFIG_FILENAME);
        }
        return resolved;
    }

    const paths = envPaths(APP_NAME, { suffix: "" });
    return path.join(paths.config, DEFAULT_CONFIG_FILENAME);
}

exports.resolveConfigFilePath = resolveConfigFilePath;

