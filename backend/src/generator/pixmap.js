const { state } = require("../appState");

const DEFAULT_IGNORED_LAYER_NAME_PATTERN = "-ignore$";

function createIgnoredLayerNameRegExp(pattern) {
    const source = pattern || DEFAULT_IGNORED_LAYER_NAME_PATTERN;
    if (!source) return null;
    return new RegExp(source);
}

function isLayerNameMatched(layer, nameRegExp) {
    if (!nameRegExp) return false;
    if (!layer || typeof layer.name !== "string") return false;
    nameRegExp.lastIndex = 0;
    return nameRegExp.test(layer.name);
}

function computeHiddenLayerIndexes(parent, nameRegExp, hideAll) {
    if (!parent.layers || !parent.layers.length) {
        return [];
    }

    return parent.layers.reduce(function (hiddenLayers, layer) {
        const isHidden = hideAll || !layer.visible || isLayerNameMatched(layer, nameRegExp);
        if (isHidden) {
            hiddenLayers.push(layer.index);
        }
        if (layer.type === "layerSection" && layer.layers && layer.layers.length) {
            hiddenLayers = hiddenLayers.concat(computeHiddenLayerIndexes(layer, nameRegExp, isHidden));
        }
        return hiddenLayers;
    }, []);
}

async function getPixmapAndImageSettings(documentId) {
    const generatorInstance = state.generatorInstance;
    const configData = state.configService.getConfigData();

    const documentInfo = await generatorInstance.getDocumentInfo(documentId, {
        compInfo: false,
        imageInfo: true,
        layerInfo: true,
        expandSmartObjects: false,
        getTextStyles: false,
        getFullTextStyles: false,
        selectedLayers: false,
        getCompLayerSettings: true,
        getDefaultLayerFX: false,
    });
    const documentBounds = documentInfo.bounds;
    const ignoredLayerNameRegExp = createIgnoredLayerNameRegExp(configData.ignoredLayerNamePattern);
    const hidden = computeHiddenLayerIndexes(documentInfo, ignoredLayerNameRegExp, false);
    const layerSpec = {
        firstLayerIndex: 0,
        lastLayerIndex: documentInfo.layers[0].index,
        hidden,
    };

    const boundsPixmap = await generatorInstance.getPixmap(documentId, layerSpec, {
        inputRect: documentBounds,
        outputRect: documentBounds,
        boundsOnly: true,
    });
    const pixmapBounds = boundsPixmap.bounds;

    const area =
        (documentBounds.bottom - documentBounds.top) * (documentBounds.right - documentBounds.left);
    const resolution = configData.processImageResolution;
    const k = Math.min(Math.sqrt((resolution * resolution * 16) / 9 / area), 1);
    const dimension = Math.round(
        Math.max(pixmapBounds.bottom - pixmapBounds.top, pixmapBounds.right - pixmapBounds.left) *
            k
    );

    const pixmap = await generatorInstance.getPixmap(documentId, layerSpec, {
        inputRect: documentBounds,
        outputRect: documentBounds,
        maxDimension: dimension,
    });

    const imageSettings = {
        format: "jpg",
        padding: {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        },
        extract: {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        },
        backgroundColor: { r: 255, g: 255, b: 255 },
    };

    if (pixmapBounds.left >= 0) {
        imageSettings.padding.left = Math.round(pixmapBounds.left * k);
        imageSettings.extract.x = 0;
    } else {
        imageSettings.extract.x = Math.round(-pixmapBounds.left * k);
        imageSettings.padding.left = 0;
    }
    if (pixmapBounds.top >= 0) {
        imageSettings.padding.top = Math.round(pixmapBounds.top * k);
        imageSettings.extract.y = 0;
    } else {
        imageSettings.extract.y = Math.round(-pixmapBounds.top * k);
        imageSettings.padding.top = 0;
    }
    if (pixmapBounds.right <= documentBounds.right) {
        imageSettings.padding.right = Math.round((documentBounds.right - pixmapBounds.right) * k);
        imageSettings.extract.width = Math.max(
            1,
            Math.round((pixmapBounds.right - pixmapBounds.left) * k) - imageSettings.extract.x
        );
    } else {
        imageSettings.extract.width = Math.max(
            1,
            Math.round((documentBounds.right - Math.max(0, pixmapBounds.left)) * k)
        );
        imageSettings.padding.right = 0;
    }
    if (pixmapBounds.bottom <= documentBounds.bottom) {
        imageSettings.padding.bottom = Math.round(
            (documentBounds.bottom - pixmapBounds.bottom) * k
        );
        imageSettings.extract.height = Math.max(
            1,
            Math.round((pixmapBounds.bottom - pixmapBounds.top) * k) - imageSettings.extract.y
        );
    } else {
        imageSettings.extract.height = Math.max(
            1,
            Math.round((documentBounds.bottom - Math.max(0, pixmapBounds.top)) * k)
        );
        imageSettings.padding.bottom = 0;
    }

    return { pixmap, imageSettings };
}

exports.getPixmapAndImageSettings = getPixmapAndImageSettings;

