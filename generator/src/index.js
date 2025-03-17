(function () {
    "use strict";

    const path = require("path");
    const fs = require("fs");
    const writeFileAtomic = require('write-file-atomic');
    const Mutex = require('./mutex');

    let _generator = null,
        _config = null;

    const plugin_name = "F_Record";

    const F_Record_Dir = path.join(getUserDirectory(), "F_Record");

    let isGettingImage = false;

    let _configData = null;
    const defaultConfigData = {
        isEnabled: false,
        processImageFolderPath: path.join(F_Record_Dir, "processImages"),
        resolution: "1080",
        quality: "50",
        idleTimeout: "1",
        language: "cn",
        lastExportTime: null,
    }

    let _nowDocument = null;
    const defaultNowDocument = {
        id: null,
        createTime: null,
        name: null,
        isGettingImage: null,
        bounds: null,
    }

    const defaultDocumentValue = {
        count: 0,
        timeSpent: 0,
        lastModifiedTime: null,
    }


    const mutex = new Mutex();

    async function updateDocumentTimeSpent() {
        const configData = _configData;
        const nowDocument = _nowDocument;
        if (configData.isEnabled === false) {
            return;
        }
        if (nowDocument.id === null) {
            return;
        }
        const documentValueFilePath = path.join(F_Record_Dir, "documentValues", `${nowDocument.createTime}.json`);
        if (!fs.existsSync(documentValueFilePath)){
            return;
        }

        const idleTimeout = parseInt(configData.idleTimeout);

        const unlock = await mutex.lock();
        try{
            let documentValue = {
                ...defaultDocumentValue,
                ...JSON.parse(fs.readFileSync(documentValueFilePath, "utf-8")),
            }
            if (documentValue.lastModifiedTime !== null 
                && (idleTimeout === 0
                    || (new Date().getTime() - documentValue.lastModifiedTime) <= idleTimeout * 60 * 1000)) {
                documentValue.timeSpent ++;
            }
            writeFileAtomic.sync(documentValueFilePath, JSON.stringify(documentValue, null, 2));
        } catch (error) {
            throw error;
        } finally {
            unlock();
        }
    }

    function getUserDirectory() {
        if (process.platform === 'win32') {
            return path.join(process.env["USERPROFILE"], 'AppData', 'Roaming');
        } else {
            return path.join(process.env["HOME"], 'Library', 'Application Support');
        }
    }
    
    function updateConfigData() {
        if (!fs.existsSync(F_Record_Dir)) {
            fs.mkdirSync(F_Record_Dir, { recursive: true });
        }
        const configDataFilePath = path.join(F_Record_Dir, "configData.json");
        let configData = {};
        if (fs.existsSync(configDataFilePath)) {
            configData = JSON.parse(fs.readFileSync(configDataFilePath, "utf-8"));
        }
        _configData = {
            ...defaultConfigData,
            ...configData,
        }
    }

    async function loopUpdateConfigData() {
        while (true) {
            try{
                updateConfigData();
            } catch (error) {
                _generator._logger.error("loopUpdateConfigData error: ", error.stack);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async function updateDoument() {
        if (!fs.existsSync(F_Record_Dir)) {
            fs.mkdirSync(F_Record_Dir, { recursive: true });
        }
        const nowDocumentFilePath = path.join(F_Record_Dir, "nowDocument.json");

        let documentInfo = null;
        let documentSettings = null;
        try{
            documentInfo = await _generator.getDocumentInfo();
            documentSettings = await _generator.getDocumentSettingsForPlugin(documentInfo.id, plugin_name);
            if (documentSettings.createTime === undefined) {
                documentSettings.createTime = getNowTimeString();
                await _generator.setDocumentSettingsForPlugin(documentSettings, plugin_name);
            }
        } catch (error) {
            _nowDocument = defaultNowDocument;
            writeFileAtomic.sync(nowDocumentFilePath, JSON.stringify(_nowDocument, null, 2));
            return;
        }
        

        const documentValueFolderPath = path.join(F_Record_Dir, "documentValues");
        if (!fs.existsSync(documentValueFolderPath)) {
            fs.mkdirSync(documentValueFolderPath, { recursive: true });
        }
        const documentValueFilePath = path.join(documentValueFolderPath, `${documentSettings.createTime}.json`);
        if (!fs.existsSync(documentValueFilePath)) {
            writeFileAtomic.sync(documentValueFilePath, JSON.stringify(defaultDocumentValue, null, 2));
        }

        _nowDocument = {
            ...defaultNowDocument,
            id: documentInfo.id,
            createTime: documentSettings.createTime,
            name: path.parse(documentInfo.file).name,
            isGettingImage: isGettingImage,
            bounds: documentInfo.bounds,
        }
        writeFileAtomic.sync(nowDocumentFilePath, JSON.stringify(_nowDocument, null, 2));
    }

    async function loopUpdateDoument() {
        while (true) {
            try{
                await updateDoument();
            } catch (error) {
                _generator._logger.error("loopUpdateDoument error: ", error.stack);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    async function getPixmapAndSaveSettings(documentId, configData) {
        const documentInfo = await _generator.getDocumentInfo(documentId);
        const documentBounds = documentInfo.bounds;

        let pixmap = await _generator.getDocumentPixmap(documentId, {
            inputRect: documentBounds,
            outputRect: documentBounds,
            boundsOnly: true,
        });
        const pixmapBounds = pixmap.bounds;
        
        const area = (documentBounds.bottom - documentBounds.top) * (documentBounds.right - documentBounds.left);
        const resolution = parseInt(configData.resolution);
        const k = Math.min(Math.sqrt(resolution * resolution * 16 / 9 / area), 1);
        const dimension = Math.round(Math.max(pixmapBounds.bottom - pixmapBounds.top, pixmapBounds.right - pixmapBounds.left) * k);
        
        pixmap = await _generator.getDocumentPixmap(documentId, {
            inputRect: documentBounds,
            outputRect: documentBounds,
            maxDimension: dimension,
        });

        let saveSettings = {
            format: "jpg",
            quality: parseInt(configData.quality),
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
            }
        }

        if (pixmapBounds.left >= 0) {
            saveSettings.padding.left = Math.round(pixmapBounds.left*k);
            saveSettings.extract.x = 0;
        } else {
            saveSettings.extract.x = Math.round(-pixmapBounds.left*k);
            saveSettings.padding.left = 0;
        }
        if (pixmapBounds.top >= 0) {
            saveSettings.padding.top = Math.round(pixmapBounds.top*k);
            saveSettings.extract.y = 0;
        } else {
            saveSettings.extract.y = Math.round(-pixmapBounds.top*k);
            saveSettings.padding.top = 0;
        }
        if (pixmapBounds.right <= documentBounds.right) {
            saveSettings.padding.right = Math.round((documentBounds.right - pixmapBounds.right)*k);
            saveSettings.extract.width = Math.max(1, Math.round((pixmapBounds.right - pixmapBounds.left)*k)-saveSettings.extract.x);
        } else {
            saveSettings.extract.width = Math.max(1, Math.round((documentBounds.right - Math.max(0, pixmapBounds.left))*k));
            saveSettings.padding.right = 0;
        }
        if (pixmapBounds.bottom <= documentBounds.bottom) {
            saveSettings.padding.bottom = Math.round((documentBounds.bottom - pixmapBounds.bottom)*k);
            saveSettings.extract.height = Math.max(1, Math.round((pixmapBounds.bottom - pixmapBounds.top)*k)-saveSettings.extract.y);
        } else {
            saveSettings.extract.height = Math.max(1, Math.round((documentBounds.bottom - Math.max(0, pixmapBounds.top))*k));
            saveSettings.padding.bottom = 0;
        }

        return [pixmap, saveSettings];
    }

    function pad(num, size) {
        var s = num.toString();
        while (s.length < size) s = "0" + s;
        return s;
    }

    function getNowTimeString() {
        var now = new Date();
        return now.getFullYear() + "-" +
            pad(now.getMonth() + 1, 2) + "-" +
            pad(now.getDate(), 2) + "-" +
            pad(now.getHours(), 2) + "-" +
            pad(now.getMinutes(), 2) + "-" +
            pad(now.getSeconds(), 2) + "-" +
            pad(now.getMilliseconds(), 3);
    }

    async function handlePixelChanged(changedEvent, documentCreateTime, configData) {
        if (isGettingImage) {
            return;
        }
        isGettingImage = true;

        let pixmap = null;
        let saveSettings = null;
        try{
            [pixmap, saveSettings] = await getPixmapAndSaveSettings(changedEvent.id, configData);
        } catch (error) {
            isGettingImage = false;
            return;
        }

        const imageFolderPath = path.join(configData.processImageFolderPath, documentCreateTime);
        if (!fs.existsSync(imageFolderPath)) {
            fs.mkdirSync(imageFolderPath, { recursive: true });
        }

        let documentValue = null;
        const documentValueFilePath = path.join(F_Record_Dir, "documentValues", `${documentCreateTime}.json`);
        if (fs.existsSync(documentValueFilePath)) {
            documentValue = {
                ...defaultDocumentValue,
                ...JSON.parse(fs.readFileSync(documentValueFilePath, "utf-8")),
            }
        } else {
            isGettingImage = false;
            return;
        }

        const imageName = `${pad(documentValue.count+1, 6)}.jpg`;
        const imageFilePath = path.join(imageFolderPath, imageName);
        try{
            await _generator.savePixmap(pixmap, imageFilePath, saveSettings);
        } catch (error) {
            isGettingImage = false;
            return;
        }

        const unlock = await mutex.lock();
        try{
            documentValue = defaultDocumentValue;
            if (fs.existsSync(documentValueFilePath)) {
                documentValue = {
                    ...documentValue,
                    ...JSON.parse(fs.readFileSync(documentValueFilePath, "utf-8")),
                }
            }
            documentValue.count ++;
            documentValue.lastModifiedTime = new Date().getTime();
            writeFileAtomic.sync(documentValueFilePath, JSON.stringify(documentValue, null, 2));
        } catch (error) {
            throw error;
        } finally {
            unlock();
        }

        isGettingImage = false;
    }

    async function handleImageChanged(changedEvent) {
        try{
            const configData = _configData;
            const nowDocument = _nowDocument;
            if (configData === null || !configData.isEnabled ) {
                return;
            }
            if (nowDocument === null || nowDocument.id !== changedEvent.id) {
                return;
            }
            if (changedEvent.layers === undefined 
                || !changedEvent.layers.some(layer => layer.pixels === true)) {
                return;
            }
            if (configData.lastExportTime !== null && new Date().getTime() - configData.lastExportTime < 1000 * 2) {
                return;
            }
            await handlePixelChanged(changedEvent, nowDocument.createTime, configData);
        } catch (error) {
            _generator._logger.error("handleImageChanged error: ", error.stack);
        }
    }

    async function loopUpdateDocumentTimeSpent() {
        setInterval(async () => {
            try{
                await updateDocumentTimeSpent();
            } catch (error) {
                _generator._logger.error("loopUpdateDocumentTimeSpent error: ", error.stack);
            }
        }, 1000);
    }

    function init(generator, config) {
        _generator = generator;
        _config = config;
        loopUpdateConfigData();
        loopUpdateDoument();
        loopUpdateDocumentTimeSpent();
        _generator.addPhotoshopEventListener("imageChanged", handleImageChanged);
    }

    exports.init = init;
}())
