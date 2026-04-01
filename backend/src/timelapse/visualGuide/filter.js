const {
    GUIDE_BOX_LINE_THICKNESS,
    VISUAL_GUIDE_BOX_COLOR,
} = require("./constants");

function buildSegmentDrawbox(segment) {
    if (!segment || !segment.box) return "";

    const width = segment.box.right - segment.box.left + 1;
    const height = segment.box.bottom - segment.box.top + 1;
    if (width <= 0 || height <= 0) return "";

    return `drawbox=x=${segment.box.left}:y=${segment.box.top}:w=${width}:h=${height}:color=${VISUAL_GUIDE_BOX_COLOR}:t=${GUIDE_BOX_LINE_THICKNESS}:enable='between(n\\,${segment.startFrame}\\,${segment.endFrame})'`;
}

function buildVisualGuideFilter(segments) {
    return (segments || [])
        .map(buildSegmentDrawbox)
        .filter(Boolean)
        .join(",");
}

exports.buildVisualGuideFilter = buildVisualGuideFilter;
