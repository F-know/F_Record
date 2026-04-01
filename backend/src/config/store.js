const path = require("path");
const Conf = require("conf");

const { resolveConfigFilePath } = require("./paths");

let configStore = null;

function createConfigStore() {
    if (configStore) return configStore;

    const desiredPath = resolveConfigFilePath();
    const cwd = path.dirname(desiredPath);
    const ext = path.extname(desiredPath);
    const configName = path.basename(desiredPath, ext || undefined);

    configStore = new Conf({
        cwd,
        configName,
        defaults: {},
    });

    return configStore;
}

exports.createConfigStore = createConfigStore;
exports.resolveConfigPath = resolveConfigFilePath;

