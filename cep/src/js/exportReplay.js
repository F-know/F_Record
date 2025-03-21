const { parentPort } = require('worker_threads')
const fs = require("fs");
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const ffmpegPath = path.resolve(__dirname, '..', 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const ffprobePath = path.resolve(__dirname, '..', 'ffmpeg', process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const FPS = 25;

parentPort.on('message', (exportParams) => {
    _exportReplay(exportParams)
        .then(() => {
            parentPort.postMessage({
                type: "exportReplaySuccess",
                data: null
            });
        })
        .catch(error => {
            parentPort.postMessage({
                type: "exportReplayError",
                data: error
            });
        });
})

const statusInfo = [
    {
        status: "loading image...",
        ratio: 0.1
    },
    {
        status: "generating video...",
        ratio: 0.8
    },
    {
        status: "saving video...",
        ratio: 0.05
    },
    {
        status: "saving video...",
        ratio: 0.05
    },
]

async function _exportReplay(exportParams) {
    const { configData, documentValue, exportSettings, exportTempFolderPath } = exportParams;
    const imageFolderPath = path.join(configData.processImageFolderPath, documentValue.createTime);
    const files = fs.readdirSync(imageFolderPath);
    const imageFiles = files
        .filter(file => /\.(jpg|jpeg|JPG|JPEG)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (imageFiles.length === 0) {  
        throw new Error('No image files found');
    }


    let lastProgressTime = 0;

    const postNowProgress = (index, percent, force = false) => {
        const now = Date.now();
        if (now - lastProgressTime >= 2000 || force) {
            percent = Math.min(percent, 1);
            percent = Math.max(percent, 0);
            let nowPercent = 0;
            for (let i = 0; i < index; i++) {
                nowPercent += statusInfo[i].ratio;
            }
            nowPercent += statusInfo[index].ratio * percent;
            parentPort.postMessage({
                type: "exportReplayProgress", 
                data: {
                    status: statusInfo[index].status,
                    percent: Math.ceil(nowPercent * 100)
                }
            });
            lastProgressTime = now;
        }
    }

    const checkJPGIntegrity = (filePath) => {
        try {
            const buffer = fs.readFileSync(filePath);
            if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
                return false;
            }
            if (buffer[buffer.length - 2] !== 0xFF || buffer[buffer.length - 1] !== 0xD9) {
                return false;
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    postNowProgress(0, 0, true)
    
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        postNowProgress(0, i / imageFiles.length);
        const newName = `${(i + 1).toString().padStart(6, '0')}.jpg`;
        const src = path.join(imageFolderPath, file);
        const dest = path.join(exportTempFolderPath, newName);
        if (checkJPGIntegrity(src)) {
            fs.copyFileSync(src, dest);
        }
    }

    postNowProgress(1, 0, true)

    const { width, height } = (function() {
        let aspectRatio = parseFloat(exportSettings.aspectRatio);
        if (aspectRatio === 0.0) {
            aspectRatio = (documentValue.bounds.right - documentValue.bounds.left) / (documentValue.bounds.bottom - documentValue.bounds.top);
        }
        let height = parseFloat(configData.resolution) * Math.sqrt(16 / 9 / aspectRatio);
        let width = height * aspectRatio;
        height = Math.max(Math.round(height / 2), 1) * 2;
        width = Math.max(Math.round(width / 2), 1) * 2;
        return { width, height };
    })();

    await new Promise((resolve, reject) => {
        const input = `${path.join(exportTempFolderPath, '%06d.jpg').replace(/\\/g, '/')}`;
        const output = path.join(exportTempFolderPath, 'mainVideo.ts');
        
        let baseFfmpeg = ffmpeg()
                            .input(input)
                            .inputOptions(['-f image2'])
                            .inputFPS(FPS)
                            .videoCodec('libx264')
        if (exportSettings.duration !== "0") {
            const duration = parseFloat(exportSettings.duration);
            let k = (duration - 3) / (imageFiles.length / FPS);
            k = Math.round(Math.min(Math.max(k, 0.001), 1) * 1000) / 1000;
            baseFfmpeg = baseFfmpeg.videoFilters('setpts=' + k + '*PTS');
        }
        baseFfmpeg
            .size(`${width}x${height}`)
            .autopad()
            .format('mpegts')
            .outputOptions('-pix_fmt yuv420p')
            .output(output)
            .on('progress', (progress) => {
                postNowProgress(1, progress.percent / 100)
            })
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                reject(new Error("ffmpeg error: " + err.message));
            })
            .run();
    });

    postNowProgress(2, 0, true)

    await new Promise((resolve, reject) => {
        const input = path.join(exportTempFolderPath, 'finalJPG.jpg');
        const output = path.join(exportTempFolderPath, 'startVideo.ts');
        ffmpeg(input)
            .inputOptions('-loop 1')
            .inputFPS(FPS)
            .duration(1)
            .videoCodec('libx264')
            .size(`${width}x${height}`)
            .autopad()
            .format('mpegts')
            .outputOptions(['-shortest', '-pix_fmt yuv420p'])
            .output(output)
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                reject(new Error("ffmpeg error: " + err.message));
            })
            .run();
    });

    postNowProgress(3, 0, true)

    await new Promise((resolve, reject) => {
        const input = path.join(exportTempFolderPath, 'finalJPG.jpg');
        const output = path.join(exportTempFolderPath, 'endVideo.ts');
        ffmpeg(input)
            .inputOptions('-loop 1')
            .inputFPS(FPS)
            .duration(2)
            .videoFilters('fade=type=in:st=0:d=1')
            .videoCodec('libx264')
            .size(`${width}x${height}`)
            .autopad()
            .format('mpegts')
            .outputOptions(['-shortest', '-pix_fmt yuv420p'])
            .output(output)
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                reject(new Error("ffmpeg error: " + err.message));
            })
            .run();
    });

    await new Promise((resolve, reject) => {
        const input1 = path.join(exportTempFolderPath, 'startVideo.ts');
        const input2 = path.join(exportTempFolderPath, 'mainVideo.ts');
        const input3 = path.join(exportTempFolderPath, 'endVideo.ts');
        const output = path.join(exportTempFolderPath, 'outputVideo.mp4');
        ffmpeg()
            .input(`concat:${input1}|${input2}|${input3}`)
            .videoCodec('copy')
            .output(output)
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                reject(new Error("ffmpeg error: " + err.message));
            })
            .run();
    });

    
    const outputPath = path.join(exportTempFolderPath, 'outputVideo.mp4');
    try {
        fs.copyFileSync(outputPath, exportSettings.savePath);
    } catch (error) {
        throw new Error("copy file error: " + error.message);
    }

    
    postNowProgress(3, 1, true)

}