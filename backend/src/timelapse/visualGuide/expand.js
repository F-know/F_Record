const {
    GUIDE_BOX_EXPAND_RATIO,
    GUIDE_BOX_EXPAND_PIXELS,
} = require("./constants");

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function gcd(a, b) {
    let x = Math.abs(Math.trunc(a));
    let y = Math.abs(Math.trunc(b));
    while (y !== 0) {
        const t = x % y;
        x = y;
        y = t;
    }
    return x || 1;
}

function computeAspectLockedSize(minWidth, minHeight, outputWidth, outputHeight) {
    const factor = gcd(outputWidth, outputHeight);
    const unitWidth = Math.max(1, Math.trunc(outputWidth / factor));
    const unitHeight = Math.max(1, Math.trunc(outputHeight / factor));
    const multiplier = Math.min(
        factor,
        Math.max(
            1,
            Math.ceil(Math.max(minWidth / unitWidth, minHeight / unitHeight))
        )
    );

    return {
        width: unitWidth * multiplier,
        height: unitHeight * multiplier,
    };
}

function expandBox(box, outputWidth, outputHeight) {
    if (!box) return null;

    const width = box.right - box.left + 1;
    const height = box.bottom - box.top + 1;
    const centerX = (box.left + box.right) / 2;
    const centerY = (box.top + box.bottom) / 2;
    const minWidth = Math.min(outputWidth, Math.ceil(width * GUIDE_BOX_EXPAND_RATIO) + GUIDE_BOX_EXPAND_PIXELS * 2);
    const minHeight = Math.min(outputHeight, Math.ceil(height * GUIDE_BOX_EXPAND_RATIO) + GUIDE_BOX_EXPAND_PIXELS * 2);
    const nextSize = computeAspectLockedSize(minWidth, minHeight, outputWidth, outputHeight);
    const nextWidth = nextSize.width;
    const nextHeight = nextSize.height;
    let left = Math.round(centerX - nextWidth / 2);
    let top = Math.round(centerY - nextHeight / 2);
    let right = left + nextWidth - 1;
    let bottom = top + nextHeight - 1;

    if (left < 0) {
        right -= left;
        left = 0;
    }
    if (top < 0) {
        bottom -= top;
        top = 0;
    }
    if (right >= outputWidth) {
        left -= right - outputWidth + 1;
        right = outputWidth - 1;
    }
    if (bottom >= outputHeight) {
        top -= bottom - outputHeight + 1;
        bottom = outputHeight - 1;
    }

    return {
        left: clamp(left, 0, outputWidth - 1),
        top: clamp(top, 0, outputHeight - 1),
        right: clamp(right, 0, outputWidth - 1),
        bottom: clamp(bottom, 0, outputHeight - 1),
    };
}

function expandGuideSegments(segments, outputWidth, outputHeight) {
    return (segments || []).map(function (segment) {
        return {
            startFrame: segment.startFrame,
            endFrame: segment.endFrame,
            box: expandBox(segment.box, outputWidth, outputHeight),
        };
    });
}

exports.expandGuideSegments = expandGuideSegments;
