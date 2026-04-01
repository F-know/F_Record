const {
    GUIDE_MAX_CHANGES_BASE,
    GUIDE_MAX_CHANGES_FRAME_COUNT,
} = require("./constants");

function createMinHeap() {
    const items = [];

    function compare(a, b) {
        if (a.delta !== b.delta) return a.delta - b.delta;
        return a.leftId - b.leftId;
    }

    function swap(i, j) {
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
    }

    function bubbleUp(index) {
        let i = index;
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (compare(items[parent], items[i]) <= 0) break;
            swap(parent, i);
            i = parent;
        }
    }

    function bubbleDown(index) {
        let i = index;
        while (true) {
            const left = i * 2 + 1;
            const right = left + 1;
            let next = i;
            if (left < items.length && compare(items[left], items[next]) < 0) {
                next = left;
            }
            if (right < items.length && compare(items[right], items[next]) < 0) {
                next = right;
            }
            if (next === i) break;
            swap(i, next);
            i = next;
        }
    }

    return {
        push(value) {
            items.push(value);
            bubbleUp(items.length - 1);
        },
        pop() {
            if (!items.length) return null;
            const top = items[0];
            const last = items.pop();
            if (items.length) {
                items[0] = last;
                bubbleDown(0);
            }
            return top;
        },
        size() {
            return items.length;
        },
    };
}

function mergeBoxes(a, b) {
    if (!a) return b ? cloneBox(b) : null;
    if (!b) return cloneBox(a);
    return {
        left: Math.min(a.left, b.left),
        top: Math.min(a.top, b.top),
        right: Math.max(a.right, b.right),
        bottom: Math.max(a.bottom, b.bottom),
    };
}

function cloneBox(box) {
    if (!box) return null;
    return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
    };
}

function getBoxArea(box) {
    if (!box) return 0;
    return Math.max(0, box.right - box.left + 1) * Math.max(0, box.bottom - box.top + 1);
}

function createSegment(id, frameIndex, box) {
    const frameCount = 1;
    const area = getBoxArea(box);
    return {
        id: id,
        startFrame: frameIndex,
        endFrame: frameIndex,
        box: cloneBox(box),
        frameCount: frameCount,
        cost: frameCount * area,
        prevId: null,
        nextId: null,
        version: 1,
        deleted: false,
    };
}

function mergeSegments(leftSegment, rightSegment, mergedId) {
    const mergedBox = mergeBoxes(leftSegment.box, rightSegment.box);
    const frameCount = leftSegment.frameCount + rightSegment.frameCount;
    return {
        id: mergedId,
        startFrame: leftSegment.startFrame,
        endFrame: rightSegment.endFrame,
        box: mergedBox,
        frameCount: frameCount,
        cost: frameCount * getBoxArea(mergedBox),
        prevId: leftSegment.prevId,
        nextId: rightSegment.nextId,
        version: 1,
        deleted: false,
    };
}

function computeMergeDelta(leftSegment, rightSegment) {
    const mergedBox = mergeBoxes(leftSegment.box, rightSegment.box);
    const mergedFrameCount = leftSegment.frameCount + rightSegment.frameCount;
    const mergedCost = mergedFrameCount * getBoxArea(mergedBox);
    return mergedCost - leftSegment.cost - rightSegment.cost;
}

function computeMaxChangeCount(frameCount) {
    return Math.max(1, Math.ceil(frameCount * GUIDE_MAX_CHANGES_BASE / GUIDE_MAX_CHANGES_FRAME_COUNT));
}

function refineGuideSegments(segments) {
    return segments;
}

function planVisualGuideSegments(diffBoxes) {
    if (!diffBoxes || !diffBoxes.length) return [];

    const heap = createMinHeap();
    const segmentsById = {};
    let headId = null;
    let tailId = null;
    let segmentCount = 0;
    let nextSegmentId = 1;

    for (let i = 0; i < diffBoxes.length; i += 1) {
        const segment = createSegment(nextSegmentId, i, diffBoxes[i]);
        nextSegmentId += 1;
        segmentsById[segment.id] = segment;
        if (tailId !== null) {
            const tail = segmentsById[tailId];
            tail.nextId = segment.id;
            segment.prevId = tail.id;
            heap.push({
                leftId: tail.id,
                rightId: segment.id,
                leftVersion: tail.version,
                rightVersion: segment.version,
                delta: computeMergeDelta(tail, segment),
            });
        }
        if (headId === null) headId = segment.id;
        tailId = segment.id;
        segmentCount += 1;
    }

    const targetSegmentCount = Math.min(segmentCount, computeMaxChangeCount(diffBoxes.length) + 1);

    while (segmentCount > targetSegmentCount && heap.size() > 0) {
        const candidate = heap.pop();
        const leftSegment = segmentsById[candidate.leftId];
        const rightSegment = segmentsById[candidate.rightId];
        if (!leftSegment || !rightSegment) continue;
        if (leftSegment.deleted || rightSegment.deleted) continue;
        if (leftSegment.version !== candidate.leftVersion || rightSegment.version !== candidate.rightVersion) {
            continue;
        }
        if (leftSegment.nextId !== rightSegment.id || rightSegment.prevId !== leftSegment.id) {
            continue;
        }

        const mergedSegment = mergeSegments(leftSegment, rightSegment, nextSegmentId);
        nextSegmentId += 1;
        segmentsById[mergedSegment.id] = mergedSegment;

        leftSegment.deleted = true;
        rightSegment.deleted = true;

        if (mergedSegment.prevId !== null) {
            const prevSegment = segmentsById[mergedSegment.prevId];
            prevSegment.nextId = mergedSegment.id;
            prevSegment.version += 1;
            heap.push({
                leftId: prevSegment.id,
                rightId: mergedSegment.id,
                leftVersion: prevSegment.version,
                rightVersion: mergedSegment.version,
                delta: computeMergeDelta(prevSegment, mergedSegment),
            });
        } else {
            headId = mergedSegment.id;
        }

        if (mergedSegment.nextId !== null) {
            const nextSegment = segmentsById[mergedSegment.nextId];
            nextSegment.prevId = mergedSegment.id;
            nextSegment.version += 1;
            heap.push({
                leftId: mergedSegment.id,
                rightId: nextSegment.id,
                leftVersion: mergedSegment.version,
                rightVersion: nextSegment.version,
                delta: computeMergeDelta(mergedSegment, nextSegment),
            });
        } else {
            tailId = mergedSegment.id;
        }

        segmentCount -= 1;
    }

    const segments = [];
    let currentId = headId;
    while (currentId !== null) {
        const currentSegment = segmentsById[currentId];
        if (currentSegment && !currentSegment.deleted) {
            segments.push({
                startFrame: currentSegment.startFrame,
                endFrame: currentSegment.endFrame,
                box: cloneBox(currentSegment.box),
            });
        }
        currentId = currentSegment ? currentSegment.nextId : null;
    }

    return refineGuideSegments(segments);
}

exports.planVisualGuideSegments = planVisualGuideSegments;
