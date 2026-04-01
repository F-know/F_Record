const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { state } = require("../appState");
const { analyzeFrameDiffBoxes } = require("./visualGuide/analyzer");
const { planVisualGuideSegments } = require("./visualGuide/planner");
const { expandGuideSegments } = require("./visualGuide/expand");
const { buildVisualGuideFilter } = require("./visualGuide/filter");

const MAX_JOB_LOG_LINES = 100;

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

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getRuntimeStore() {
    return state.runtime.timelapseExport;
}

function createJobId() {
    const store = getRuntimeStore();
    const seq = store.nextJobSeq || 1;
    store.nextJobSeq = seq + 1;
    return `timelapse_${Date.now()}_${seq}`;
}

function resolveFfmpegPath() {
    const baseDir = path.resolve(__dirname, "..", "..", "ffmpeg");
    const candidates = process.platform === "win32"
        ? [path.join(baseDir, "ffmpeg.exe"), path.join(baseDir, "ffmpeg")]
        : [path.join(baseDir, "ffmpeg"), path.join(baseDir, "ffmpeg.exe")];

    for (let i = 0; i < candidates.length; i += 1) {
        if (fs.existsSync(candidates[i])) {
            return candidates[i];
        }
    }
    return "ffmpeg";
}

function resolveFfprobePath() {
    const baseDir = path.resolve(__dirname, "..", "..", "ffmpeg");
    const candidates = process.platform === "win32"
        ? [path.join(baseDir, "ffprobe.exe"), path.join(baseDir, "ffprobe")]
        : [path.join(baseDir, "ffprobe"), path.join(baseDir, "ffprobe.exe")];

    for (let i = 0; i < candidates.length; i += 1) {
        if (fs.existsSync(candidates[i])) {
            return candidates[i];
        }
    }
    return "ffprobe";
}

function formatTimestampForFileName(ts) {
    const d = new Date(ts);
    const pad = function (n) {
        return String(n).padStart(2, "0");
    };
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function getOutputDir(uid) {
    const configData = state.configService.getConfigData();
    return path.join(configData.processImageFolderPath, "_exports", uid);
}

function listFrameFiles(inputDir) {
    if (!fs.existsSync(inputDir)) return [];
    return fs.readdirSync(inputDir)
        .filter(function (name) {
            return /\.jpe?g$/i.test(name);
        })
        .sort();
}

function escapeConcatPath(filePath) {
    return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function buildConcatContent(inputDir, fileNames, fps) {
    const duration = 1 / fps;
    const lines = ["ffconcat version 1.0"];
    for (let i = 0; i < fileNames.length; i += 1) {
        const fullPath = path.join(inputDir, fileNames[i]);
        lines.push(`file '${escapeConcatPath(fullPath)}'`);
        lines.push(`duration ${duration}`);
    }
    if (fileNames.length > 0) {
        const lastPath = path.join(inputDir, fileNames[fileNames.length - 1]);
        lines.push(`file '${escapeConcatPath(lastPath)}'`);
    }
    return lines.join("\n") + "\n";
}

function toEvenPositive(value) {
    let n = Math.max(2, Math.round(value));
    if (n % 2 !== 0) n += 1;
    return n;
}

function computeOutputSizeByLastFrame(lastFrameWidth, lastFrameHeight, resolution) {
    const safeResolution = Math.max(2, Math.round(Number(resolution) || 1080));
    if (lastFrameWidth >= lastFrameHeight) {
        return {
            width: toEvenPositive(safeResolution),
            height: toEvenPositive(safeResolution * lastFrameHeight / lastFrameWidth),
        };
    }
    return {
        width: toEvenPositive(safeResolution * lastFrameWidth / lastFrameHeight),
        height: toEvenPositive(safeResolution),
    };
}

function probeImageSize(filePath) {
    return new Promise(function (resolve) {
        const ffprobePath = resolveFfprobePath();
        const args = [
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "default=noprint_wrappers=1:nokey=1",
            filePath,
        ];

        let stdout = "";
        let stderr = "";
        const child = spawn(ffprobePath, args, { windowsHide: true });

        child.stdout.on("data", function (chunk) {
            stdout += String(chunk);
        });
        child.stderr.on("data", function (chunk) {
            stderr += String(chunk);
        });
        child.on("error", function (err) {
            resolve({ ok: false, error: err && err.message ? err.message : "ffprobe 启动失败" });
        });
        child.on("close", function (code) {
            if (code !== 0) {
                resolve({ ok: false, error: stderr.trim() || `ffprobe exited with code ${code}` });
                return;
            }

            const lines = stdout
                .split(/\r?\n/)
                .map(function (line) { return line.trim(); })
                .filter(Boolean);
            const width = Number(lines[0]);
            const height = Number(lines[1]);
            if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                resolve({ ok: false, error: "无法读取图片宽高" });
                return;
            }
            resolve({ ok: true, width: Math.trunc(width), height: Math.trunc(height) });
        });
    });
}

async function collectValidFrames(inputDir, fileNames, onProgress) {
    const validFrames = [];
    const deletedFiles = [];

    for (let i = 0; i < fileNames.length; i += 1) {
        const name = fileNames[i];
        const fullPath = path.join(inputDir, name);
        const result = await probeImageSize(fullPath);
        if (result.ok) {
            validFrames.push({
                name: name,
                width: result.width,
                height: result.height,
            });
        } else {
            try {
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            } catch (err) {
                // ignore delete failure
            }
            deletedFiles.push({ name: name, error: result.error || "图片损坏" });
        }
        if (typeof onProgress === "function") {
            onProgress(i + 1, fileNames.length);
        }
    }

    return {
        validFrames: validFrames,
        deletedFiles: deletedFiles,
    };
}

function pushJobLog(job, line) {
    if (!line) return;
    job.logLines.push(String(line));
    if (job.logLines.length > MAX_JOB_LOG_LINES) {
        job.logLines.splice(0, job.logLines.length - MAX_JOB_LOG_LINES);
    }
}

function parseProgressLine(job, line) {
    if (!line) return;
    if (line.indexOf("=") < 0) {
        pushJobLog(job, line);
        return;
    }

    const idx = line.indexOf("=");
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);

    if (key === "frame") {
        const frame = Number(value);
        if (Number.isFinite(frame)) {
            job.progressFrames = Math.max(0, Math.trunc(frame));
            if (job.frameCount > 0) {
                const frameRatio = Math.min(job.progressFrames / job.frameCount, 1);
                const encodeBase = Number(job.encodeProgressBase) || 0;
                const encodeSpan = Number(job.encodeProgressSpan) || 1;
                job.progressRatio = Math.min(encodeBase + encodeSpan * frameRatio, 1);
            }
        }
    } else if (key === "progress" && value === "end") {
        job.progressRatio = 1;
    }
}

function setJobStatus(job, status, errorMessage) {
    job.status = status;
    if (status === "running") {
        job.startedTime = Date.now();
    }
    if (status === "success" || status === "failed" || status === "cancelled") {
        job.finishedTime = Date.now();
    }
    if (errorMessage) {
        job.errorMessage = errorMessage;
    }
}

function setJobPhase(job, phase) {
    job.phase = phase;
}

function setJobProgress(job, progressRatio) {
    job.progressRatio = clamp(Number(progressRatio) || 0, 0, 1);
}

function startNextJobIfIdle() {
    const store = getRuntimeStore();
    if (store.runningJobId) return;
    if (!store.queue.length) return;

    const jobId = store.queue.shift();
    const job = store.jobsById[jobId];
    if (!job) {
        startNextJobIfIdle();
        return;
    }

    store.runningJobId = jobId;
    runJob(job).then(function () {
        store.runningJobId = null;
        startNextJobIfIdle();
    }).catch(function (err) {
        store.runningJobId = null;
        setJobStatus(job, "failed", err && err.message ? err.message : String(err));
        setJobPhase(job, "failed");
        state.logger.error("timelapse:runJob", err);
        startNextJobIfIdle();
    });
}

function buildBaseVideoFilter(job) {
    return `scale=${job.outputWidth}:${job.outputHeight}:force_original_aspect_ratio=decrease,pad=${job.outputWidth}:${job.outputHeight}:(ow-iw)/2:(oh-ih)/2:black`;
}

function buildVideoFilter(job) {
    const filters = [buildBaseVideoFilter(job)];
    if (job.visualGuideEnabled && job.guideSegments && job.guideSegments.length > 0) {
        const guideFilter = buildVisualGuideFilter(job.guideSegments);
        if (guideFilter) {
            filters.push(guideFilter);
        }
    }
    return filters.join(",");
}

function cloneJobForClient(job) {
    if (!job) return null;
    const cloned = cloneJson(job);
    delete cloned.guideSegments;
    delete cloned.encodeProgressBase;
    delete cloned.encodeProgressSpan;
    return cloned;
}

async function prepareJobFrames(job) {
    const scanProgressEnd = job.visualGuideEnabled ? 0.15 : 0.4;
    setJobPhase(job, "scanningFrames");
    setJobProgress(job, 0);

    const frameScanResult = await collectValidFrames(
        job.inputDir,
        job.frameFiles,
        function (done, total) {
            if (!total) return;
            setJobProgress(job, scanProgressEnd * done / total);
        }
    );
    const validFrames = frameScanResult.validFrames;
    if (!validFrames.length) {
        const err = new Error("过程图片文件夹中的 jpg 图片全部损坏，无法导出");
        err.code = "NO_VALID_TIMELAPSE_FRAMES";
        throw err;
    }

    job.deletedBrokenFrameCount = frameScanResult.deletedFiles.length;
    job.frameFiles = validFrames.map(function (frame) { return frame.name; });
    job.frameCount = validFrames.length;

    const lastFrame = validFrames[validFrames.length - 1];
    const outputSize = computeOutputSizeByLastFrame(
        lastFrame.width,
        lastFrame.height,
        job.processImageResolution
    );
    job.outputWidth = outputSize.width;
    job.outputHeight = outputSize.height;

    if (frameScanResult.deletedFiles.length > 0) {
        pushJobLog(job, `deleted broken frames: ${frameScanResult.deletedFiles.length}`);
        for (let i = 0; i < frameScanResult.deletedFiles.length; i += 1) {
            pushJobLog(job, `deleted ${frameScanResult.deletedFiles[i].name}: ${frameScanResult.deletedFiles[i].error}`);
        }
    }
    pushJobLog(job, `target size: ${job.outputWidth}x${job.outputHeight}`);
}

async function prepareVisualGuide(job) {
    if (!job.visualGuideEnabled) {
        job.guideSegments = [];
        job.guideSegmentCount = 0;
        return;
    }

    setJobPhase(job, "planningVisualGuide");
    setJobProgress(job, 0.15);

    const diffBoxes = await analyzeFrameDiffBoxes({
        inputDir: job.inputDir,
        frameFiles: job.frameFiles,
        outputWidth: job.outputWidth,
        outputHeight: job.outputHeight,
        onProgress: function (done, total) {
            if (!total) return;
            setJobProgress(job, 0.15 + 0.5 * done / total);
        },
    });

    let guideSegments = planVisualGuideSegments(diffBoxes);
    guideSegments = expandGuideSegments(
        guideSegments,
        job.outputWidth,
        job.outputHeight
    );

    job.guideSegments = guideSegments;
    job.guideSegmentCount = guideSegments.filter(function (segment) {
        return !!(segment && segment.box);
    }).length;
    pushJobLog(job, `visual guide segments: ${job.guideSegmentCount}`);
    setJobProgress(job, 0.7);
}

function runJob(job) {
    return Promise.resolve().then(async function () {
        setJobStatus(job, "running");
        try {
            await prepareJobFrames(job);
            await prepareVisualGuide(job);
        } catch (err) {
            job.pid = null;
            setJobStatus(job, "failed", err && err.message ? err.message : String(err));
            setJobPhase(job, "failed");
            pushJobLog(job, job.errorMessage);
            state.logger.error("timelapse:prepare", err);
            return;
        }

        return new Promise(function (resolve) {
            const ffmpegPath = resolveFfmpegPath();
            const outputDir = path.dirname(job.outputFilePath);
            ensureDirSync(outputDir);

            const concatContent = buildConcatContent(job.inputDir, job.frameFiles, job.fps);
            fs.writeFileSync(job.concatFilePath, concatContent, "utf8");
            job.encodeProgressBase = job.visualGuideEnabled ? 0.7 : 0.4;
            job.encodeProgressSpan = job.visualGuideEnabled ? 0.3 : 0.6;
            setJobPhase(job, "encoding");
            setJobProgress(job, job.encodeProgressBase);

            const args = [
                "-y",
                "-safe", "0",
                "-f", "concat",
                "-i", job.concatFilePath,
                "-r", String(job.fps),
                "-vf", buildVideoFilter(job),
                "-c:v", "libx264",
                "-preset", "medium",
                "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-progress", "pipe:1",
                "-nostats",
                job.outputFilePath,
            ];

            pushJobLog(job, `spawn: ${ffmpegPath} ${args.join(" ")}`);
            state.logger.info("timelapse", `start export job=${job.id} uid=${job.uid}`);

            let stdoutBuffer = "";
            let stderrBuffer = "";
            const child = spawn(ffmpegPath, args, { windowsHide: true });
            job.pid = child.pid;

            function flushStdout(force) {
                let index = stdoutBuffer.indexOf("\n");
                while (index >= 0) {
                    const line = stdoutBuffer.slice(0, index).trim();
                    stdoutBuffer = stdoutBuffer.slice(index + 1);
                    parseProgressLine(job, line);
                    index = stdoutBuffer.indexOf("\n");
                }
                if (force && stdoutBuffer.trim()) {
                    parseProgressLine(job, stdoutBuffer.trim());
                    stdoutBuffer = "";
                }
            }

            function flushStderr(force) {
                let index = stderrBuffer.indexOf("\n");
                while (index >= 0) {
                    const line = stderrBuffer.slice(0, index).trim();
                    stderrBuffer = stderrBuffer.slice(index + 1);
                    pushJobLog(job, line);
                    index = stderrBuffer.indexOf("\n");
                }
                if (force && stderrBuffer.trim()) {
                    pushJobLog(job, stderrBuffer.trim());
                    stderrBuffer = "";
                }
            }

            child.stdout.on("data", function (chunk) {
                stdoutBuffer += String(chunk);
                flushStdout(false);
            });

            child.stderr.on("data", function (chunk) {
                stderrBuffer += String(chunk);
                flushStderr(false);
            });

            child.on("error", function (err) {
                flushStdout(true);
                flushStderr(true);
                setJobStatus(job, "failed", err && err.message ? err.message : "ffmpeg 启动失败");
                setJobPhase(job, "failed");
                pushJobLog(job, job.errorMessage);
                cleanupConcatFile(job.concatFilePath);
                resolve();
            });

            child.on("close", function (code) {
                flushStdout(true);
                flushStderr(true);
                job.pid = null;
                cleanupConcatFile(job.concatFilePath);
                if (code === 0) {
                    setJobStatus(job, "success");
                    setJobPhase(job, "success");
                    job.progressRatio = 1;
                    state.logger.info("timelapse", `finish export job=${job.id} uid=${job.uid}`);
                } else {
                    setJobStatus(job, "failed", `ffmpeg exited with code ${code}`);
                    setJobPhase(job, "failed");
                    pushJobLog(job, job.errorMessage);
                    state.logger.warn("timelapse", `export failed job=${job.id} code=${code}`);
                }
                resolve();
            });
        });
    });
}

function cleanupConcatFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        // ignore
    }
}

function createTimelapseService() {
    async function createExportJob(uid, options) {
        const cleanUid = uid ? String(uid).trim() : "";
        if (!cleanUid) {
            const err = new Error("uid 不能为空");
            err.code = "INVALID_UID";
            throw err;
        }

        const configData = state.configService.getConfigData();
        const timelapseDefaults = configData.timelapse || {};
        const fps = options && Number(options.fps) > 0
            ? Math.trunc(Number(options.fps))
            : Math.max(1, Math.trunc(Number(timelapseDefaults.defaultFps) || 30));
        const visualGuideEnabled = options && Object.prototype.hasOwnProperty.call(options, "enableVisualGuide")
            ? !!options.enableVisualGuide
            : !!timelapseDefaults.enableVisualGuide;
        const inputDir = path.join(configData.processImageFolderPath, cleanUid);
        const rawFrameFiles = listFrameFiles(inputDir);
        if (!rawFrameFiles.length) {
            const err = new Error("过程图片文件夹中没有可导出的 jpg 图片");
            err.code = "NO_TIMELAPSE_FRAMES";
            throw err;
        }

        const jobId = createJobId();
        const outputDir = getOutputDir(cleanUid);
        ensureDirSync(outputDir);

        const outputFilePath = path.join(outputDir, `timelapse-${formatTimestampForFileName(Date.now())}.mp4`);
        const concatFilePath = path.join(outputDir, `${jobId}.ffconcat`);

        const job = {
            id: jobId,
            uid: cleanUid,
            status: "queued",
            phase: "queued",
            createdTime: Date.now(),
            startedTime: null,
            finishedTime: null,
            fps: fps,
            visualGuideEnabled: visualGuideEnabled,
            frameCount: rawFrameFiles.length,
            progressFrames: 0,
            progressRatio: 0,
            inputDir: inputDir,
            outputFilePath: outputFilePath,
            concatFilePath: concatFilePath,
            frameFiles: rawFrameFiles,
            outputWidth: null,
            outputHeight: null,
            processImageResolution: configData.processImageResolution,
            errorMessage: null,
            logLines: [],
            pid: null,
            deletedBrokenFrameCount: 0,
            guideSegmentCount: 0,
            guideSegments: [],
            encodeProgressBase: 0,
            encodeProgressSpan: 1,
        };
        pushJobLog(job, `queued export fps=${fps} visualGuide=${visualGuideEnabled ? "on" : "off"}`);

        const store = getRuntimeStore();
        store.jobsById[job.id] = job;
        store.jobOrder.unshift(job.id);
        store.queue.push(job.id);
        startNextJobIfIdle();
        return cloneJobForClient(job);
    }

    function listJobs() {
        const store = getRuntimeStore();
        return store.jobOrder.map(function (id) {
            return cloneJobForClient(store.jobsById[id]);
        }).filter(Boolean);
    }

    function getJob(jobId) {
        const store = getRuntimeStore();
        const job = store.jobsById[jobId];
        return job ? cloneJobForClient(job) : null;
    }

    function openOutputFolder(jobId) {
        const store = getRuntimeStore();
        const job = store.jobsById[jobId];
        if (!job) {
            const err = new Error("任务不存在");
            err.code = "TIMELAPSE_JOB_NOT_FOUND";
            throw err;
        }
        const outputDir = path.dirname(job.outputFilePath);
        if (!fs.existsSync(outputDir)) {
            const err = new Error("输出文件夹不存在");
            err.code = "TIMELAPSE_OUTPUT_DIR_NOT_FOUND";
            throw err;
        }
        const { openPath } = require("../openBrowser");
        openPath(outputDir);
        return { ok: true, path: outputDir };
    }

    return {
        createExportJob,
        listJobs,
        getJob,
        openOutputFolder,
    };
}

exports.createTimelapseService = createTimelapseService;

