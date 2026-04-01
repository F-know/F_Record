const path = require("path");
const Jimp = require("jimp");

const {
    ANALYSIS_LONG_EDGE,
    GUIDE_DIFF_THRESHOLD,
} = require("./constants");

function toEvenPositive(value) {
    let n = Math.max(2, Math.round(value));
    if (n % 2 !== 0) n += 1;
    return n;
}

function computeAnalysisSize(outputWidth, outputHeight) {
    const longEdge = ANALYSIS_LONG_EDGE;
    if (outputWidth >= outputHeight) {
        return {
            width: toEvenPositive(longEdge),
            height: toEvenPositive(longEdge * outputHeight / outputWidth),
        };
    }
    return {
        width: toEvenPositive(longEdge * outputWidth / outputHeight),
        height: toEvenPositive(longEdge),
    };
}

async function normalizeImageToCanvas(filePath, canvasWidth, canvasHeight) {
    const sourceImage = await Jimp.read(filePath);
    const sourceWidth = sourceImage.bitmap.width;
    const sourceHeight = sourceImage.bitmap.height;
    const scale = Math.min(canvasWidth / sourceWidth, canvasHeight / sourceHeight);
    const resizedWidth = Math.max(1, Math.round(sourceWidth * scale));
    const resizedHeight = Math.max(1, Math.round(sourceHeight * scale));
    const offsetX = Math.floor((canvasWidth - resizedWidth) / 2);
    const offsetY = Math.floor((canvasHeight - resizedHeight) / 2);

    const canvas = await new Promise(function (resolve, reject) {
        new Jimp(canvasWidth, canvasHeight, 0x000000FF, function (err, image) {
            if (err) {
                reject(err);
                return;
            }
            resolve(image);
        });
    });

    const resizedImage = sourceImage.clone().resize(resizedWidth, resizedHeight, Jimp.RESIZE_BILINEAR);
    canvas.composite(resizedImage, offsetX, offsetY);
    return canvas;
}

function computeDiffBox(previousImage, currentImage, threshold) {
    const width = currentImage.bitmap.width;
    const height = currentImage.bitmap.height;
    const prevData = previousImage.bitmap.data;
    const currentData = currentImage.bitmap.data;

    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * 4;
            const dr = Math.abs(currentData[offset] - prevData[offset]);
            const dg = Math.abs(currentData[offset + 1] - prevData[offset + 1]);
            const db = Math.abs(currentData[offset + 2] - prevData[offset + 2]);
            if (Math.max(dr, dg, db) < threshold) {
                continue;
            }

            if (x < left) left = x;
            if (y < top) top = y;
            if (x > right) right = x;
            if (y > bottom) bottom = y;
        }
    }

    if (right < left || bottom < top) {
        return null;
    }

    return {
        left: left,
        top: top,
        right: right,
        bottom: bottom,
    };
}

function mapBoxToOutput(box, analysisWidth, analysisHeight, outputWidth, outputHeight) {
    if (!box) return null;

    const scaleX = outputWidth / analysisWidth;
    const scaleY = outputHeight / analysisHeight;
    const left = Math.max(0, Math.floor(box.left * scaleX));
    const top = Math.max(0, Math.floor(box.top * scaleY));
    const right = Math.min(outputWidth - 1, Math.ceil((box.right + 1) * scaleX) - 1);
    const bottom = Math.min(outputHeight - 1, Math.ceil((box.bottom + 1) * scaleY) - 1);

    if (right < left || bottom < top) {
        return null;
    }

    return {
        left: left,
        top: top,
        right: right,
        bottom: bottom,
    };
}

async function analyzeFrameDiffBoxes(options) {
    const inputDir = options.inputDir;
    const frameFiles = options.frameFiles || [];
    const outputWidth = options.outputWidth;
    const outputHeight = options.outputHeight;
    const onProgress = options.onProgress;
    const analysisSize = computeAnalysisSize(outputWidth, outputHeight);
    const diffBoxes = new Array(frameFiles.length);
    let previousImage = null;

    for (let i = 0; i < frameFiles.length; i += 1) {
        const filePath = path.join(inputDir, frameFiles[i]);
        const currentImage = await normalizeImageToCanvas(
            filePath,
            analysisSize.width,
            analysisSize.height
        );

        if (i === 0) {
            diffBoxes[i] = null;
        } else {
            const analysisBox = computeDiffBox(previousImage, currentImage, GUIDE_DIFF_THRESHOLD);
            diffBoxes[i] = mapBoxToOutput(
                analysisBox,
                analysisSize.width,
                analysisSize.height,
                outputWidth,
                outputHeight
            );
        }

        previousImage = currentImage;
        if (typeof onProgress === "function") {
            onProgress(i + 1, frameFiles.length);
        }
    }

    return diffBoxes;
}

exports.analyzeFrameDiffBoxes = analyzeFrameDiffBoxes;
