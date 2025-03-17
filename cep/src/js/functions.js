const fs = require("fs");
const path = require('path');
const writeFileAtomic = require('write-file-atomic');
const { exec } = require('child_process');
const { Worker } = require('worker_threads');


function getUserDirectory() {
    if (process.platform === 'win32') {
        return path.join(process.env["USERPROFILE"], 'AppData', 'Roaming');
    } else {
        return path.join(process.env["HOME"], 'Library', 'Application Support');
    }
}

function isExist(path) {
    return fs.existsSync(path);
}

function createDir(path) {
    fs.mkdirSync(path, { recursive: true });
}

function writeFile(path, content) {
    writeFileAtomic.sync(path, content);
}

function readFile(path) {
    return fs.readFileSync(path, 'utf8');
}

function readDir(path) {
    return fs.readdirSync(path);
}

function unlinkFile(path) {
    fs.unlinkSync(path);
}

function deleteDir(path) {
    fs.rmSync(path, { recursive: true, force: true });
}

function openLocalPath(path) {
    if (process.platform === 'win32') {
        exec(`start "" "${path}"`);
    } else {
        exec(`open "${path}"`);
    }
}


async function exportReplay(exportParams, onProgress) {
    return new Promise((resolve, reject) => {
        const workerPath = path.join(__dirname, 'js', 'exportReplay.js');
        const worker = new Worker(workerPath);

        worker.on('message', (e) => {
            const { type, data } = e;
            switch (type) {
            case "exportReplayProgress":
                onProgress(data);
                break;
            case "exportReplaySuccess":
                resolve();
                break;
            case "exportReplayError":
                reject(data);
                break;
            }
        });
        worker.on('error', (error) => {
            reject(error);
        });
        worker.on('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Worker exited with code ${code}`));
            }
        });
        worker.postMessage(exportParams);
    });
}