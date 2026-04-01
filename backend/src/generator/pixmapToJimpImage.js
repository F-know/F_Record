const Jimp = require("jimp");

function createBlankImage(width, height) {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line no-new
        new Jimp(width, height, (err, image) => {
            if (err) return reject(err);
            return resolve(image);
        });
    });
}

function toLowerStringOrDefault(value, defaultValue) {
    if (typeof value === "string" && value.trim() !== "") return value.toLowerCase();
    return defaultValue;
}

async function pixmapToJimpImage(pixmap, imageSettings) {
    const width = pixmap.width || 0;
    const height = pixmap.height || 0;
    const pixels = pixmap.pixels;
    const bytesPerPixel = pixmap.bytesPerPixel || 4;
    const rowBytes = pixmap.rowBytes || width * bytesPerPixel;

    const formatType = toLowerStringOrDefault(imageSettings.format, "jpg");
    const extract = imageSettings.extract;
    const padding = imageSettings.padding;
    const backgroundColor = imageSettings.backgroundColor || { r: 255, g: 255, b: 255 };

    const targetWidth = extract.width + padding.left + padding.right;
    const targetHeight = extract.height + padding.top + padding.bottom;

    const image = await createBlankImage(targetWidth, targetHeight);

    const buffer = Buffer.alloc(targetWidth * targetHeight * 4);
    if (formatType === "png") {
        buffer.fill(0);
    } else {
        for (let i = 0; i < buffer.length; i += 4) {
            buffer[i] = backgroundColor.r;
            buffer[i + 1] = backgroundColor.g;
            buffer[i + 2] = backgroundColor.b;
            buffer[i + 3] = 255;
        }
    }

    for (let y = 0; y < extract.height; y += 1) {
        const targetY = y + padding.top;
        const srcY = extract.y + y;

        const srcRowOffset = srcY * rowBytes;
        const targetRowStart = (targetY * targetWidth + padding.left) * 4;

        const copyWidth = Math.min(extract.width, width - extract.x);
        for (let x = 0; x < copyWidth; x += 1) {
            const srcOffset = srcRowOffset + (extract.x + x) * bytesPerPixel;
            const targetOffset = targetRowStart + x * 4;

            const alpha = pixels[srcOffset];
            if (formatType !== "png" && alpha === 0) {
                continue;
            }

            buffer[targetOffset] = pixels[srcOffset + 1];
            buffer[targetOffset + 1] = pixels[srcOffset + 2];
            buffer[targetOffset + 2] = pixels[srcOffset + 3];
            buffer[targetOffset + 3] = alpha;

            if (formatType !== "png" && alpha < 255 && alpha > 0) {
                const alphaFactor = alpha / 255;
                buffer[targetOffset] = Math.round(
                    buffer[targetOffset] * alphaFactor + backgroundColor.r * (1 - alphaFactor)
                );
                buffer[targetOffset + 1] = Math.round(
                    buffer[targetOffset + 1] * alphaFactor +
                        backgroundColor.g * (1 - alphaFactor)
                );
                buffer[targetOffset + 2] = Math.round(
                    buffer[targetOffset + 2] * alphaFactor +
                        backgroundColor.b * (1 - alphaFactor)
                );
                buffer[targetOffset + 3] = 255;
            }
        }
    }

    image.bitmap.data = buffer;
    image.bitmap.width = targetWidth;
    image.bitmap.height = targetHeight;

    return image;
}

exports.pixmapToJimpImage = pixmapToJimpImage;

