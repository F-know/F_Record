const { exec } = require("child_process");

function openUrl(url) {
    if (!url || typeof url !== "string") return;

    try {
        if (process.platform === "win32") {
            // start "" "<url>"
            exec(`cmd /c start "" "${url}"`);
            return;
        }
        if (process.platform === "darwin") {
            exec(`open "${url}"`);
            return;
        }
        exec(`xdg-open "${url}"`);
    } catch (err) {
        // ignore
    }
}

function openPath(targetPath) {
    if (!targetPath || typeof targetPath !== "string") return;

    try {
        if (process.platform === "win32") {
            exec(`cmd /c start "" "${targetPath}"`);
            return;
        }
        if (process.platform === "darwin") {
            exec(`open "${targetPath}"`);
            return;
        }
        exec(`xdg-open "${targetPath}"`);
    } catch (err) {
        // ignore
    }
}

exports.openUrl = openUrl;
exports.openPath = openPath;

