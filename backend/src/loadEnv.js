const path = require("path");

function loadEnv() {
    try {
        // eslint-disable-next-line global-require
        const dotenv = require("dotenv");
        const envPath = path.resolve(__dirname, "..", ".env");
        dotenv.config({ path: envPath });
    } catch (err) {
        // ignore
    }
}

exports.loadEnv = loadEnv;

