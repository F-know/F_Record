const path = require("path");
const { spawnSync } = require("child_process");

const frontendDir = path.resolve(__dirname, "frontend");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const result = spawnSync(npmCommand, ["run", "build:dist"], {
    cwd: frontendDir,
    stdio: "inherit",
    env: process.env,
});

if (result.error) {
    throw result.error;
}

process.exit(result.status === null ? 1 : result.status);
