

(function () {
    "use strict";

    // 两个全局变量保存传进来的参数
    var _generator = null,
        _config = null;

    // 定义我们的扩展id和菜单栏显示名称
    var plugin_id = "F_Record 1.0";
    var menu_name = "F_Record 1.0";

    var save_path = null;
    var min_record_interval = null;
    let ok = false;

    // 核心调用此方法，传递两个参数
    // generator 核心对象，是所有接口方法调用的主体
    // config 生成器的一些配置，包含Ps安装路径，版本等信息
    function init(generator, config) {
        _generator = generator;
        _config = config;
        // 添加菜单栏
        _generator.addMenuItem(plugin_id, menu_name, true, false).then(
            function () {
                console.log("Menu created", plugin_id);
            }, function () {
                console.error("Menu creation failed", plugin_id);
            }
        );
        // 当我们点击那个菜单栏选项的时候，触发此回调
        _generator.onPhotoshopEvent("generatorMenuChanged", handleGeneratorMenuClicked);
    }

    function handleGeneratorMenuClicked(event) {
        // 点击其它生成器名称也会触发此回调，需要在这里做过滤
        console.log('!')
        var menu = event.generatorMenuChanged;
        if (!menu || menu.name !== plugin_id) {
            return;
        }

        // 来自插件面板的消息
        const attr = event.generatorMenuChanged.sampleAttribute;
        if (attr) {
            console.log(`receive message from panel[${attr}]`);
            const msg = JSON.parse(attr);
            
            if (msg.from === 'panel' && msg.action === 'start-record') {
                console.log('receive action start preview from panel');
                // 开始录制
                startPreview();
            }
            else if (msg.from === 'panel' && msg.action === 'stop-record') {
                console.log('receive action stop preview from panel');
                // 停止录制
                stopPreview();
            }else if (msg.from === 'panel' && msg.action === 'get-canvas-size') {
                getCanvasSize();
            }else if (msg.from === 'panel' && msg.action === 'update-save-path') {
                save_path = decodeURIComponent(msg.value);
                console.log(save_path);
            }else if (msg.from === 'panel' && msg.action === 'update-min-record-interval') {
                // console.log('???'); 
                min_record_interval = msg.value;
                // console.log(typeof(min_record_interval));
            }else if (msg.from === 'panel' && msg.action === 'get-record-status') {
                const file = require("path").join(__dirname, 'event-dispatch.jsx');
                _generator.evaluateJSXFile(file, {data: JSON.stringify({recordStatus: ok})});
            }
            /*
            if (ret != null) {
                const path = require('path');
                const file = path.join(__dirname, 'photoshop', 'jsx', 'eventDispatch.jsx');
                _generator.evaluateJSXFile(file, {data: JSON.stringify(ret)});
            }
             */
        } else {
            _generator.evaluateJSXString(`alert("You click me!)`);
            // startPreview();
        }
    }
    let isFunctionExecuting = false;

    function startPreview() {
        // 监听Ps的事件
        ok = true;
        _generator.onPhotoshopEvent("imageChanged", handleImageChanged);
        // _generator.onPhotoshopEvent("currentDocumentChanged", handleCurrentDocumentChanged);
        // _generator.onPhotoshopEvent("toolChanged", handleToolChanged);
        refreshImage();
    }

    function stopPreview() {
        isFunctionExecuting = false;
        refreshImage();
        ok = false;
    }

    async function getCanvasSize() {
        // console.log('??');
        try{
            const document = await _generator.getDocumentInfo();
            const pixmap = await getImage(document.id, document.bounds);
            if(pixmap){
                const file = require("path").join(__dirname, 'event-dispatch.jsx');
                _generator.evaluateJSXFile(file, {data: JSON.stringify({canvasSize: [pixmap.width, pixmap.height]})});
                // console.log(pixmap.width);
            }
        }catch(error){
            // console.log('??');
        }
        // console.log('??');
    }

    function handleImageChanged(document) {
        console.log("Image " + document.id + " was changed:");//, stringify(document));
        refreshImage();
    }

    function handleCurrentDocumentChanged(id) {
        console.log("handleCurrentDocumentChanged: "+id)
        refreshImage();
    }

    // function handleToolChanged(document){
    //     console.log("Tool changed " + document.id + " was changed:");//, stringify(document));
    //     refreshImage();
    // }

    
    // 刷新图片
    async function refreshImage() {
        // console.log(save_path);
        if (!ok){
            return;
        }
        if (isFunctionExecuting) {
            return;
        }
        isFunctionExecuting = true;
        try {
            ////////////
            const document = await _generator.getDocumentInfo();
            const pixmap = await getImage(document.id, document.bounds);
            if (pixmap) {
                // 保存文件到本地，获取到该图片的路径
                const output = await saveImageToPNG(pixmap, document.id);
                // 将该路径发送给插件面板
                const file = require("path").join(__dirname, 'event-dispatch.jsx');
                _generator.evaluateJSXFile(file, {data: JSON.stringify({imageChanged: output})});
            }
            ////////////
            await new Promise(resolve => setTimeout(resolve, min_record_interval*1000));
        } catch(error) {

        } finally {
            isFunctionExecuting = false;
        }
    }

    /**
     * 获取文档信息，如果不传documentId，就获取当前文档
     * @param documentId
     */
    function getDocumentInfo(documentId) {
        _generator.getDocumentInfo(documentId).then(
            function (document) {
                console.log("Received complete document:", JSON.stringify(document, null, 4));
                getImage(document.id, document.bounds);
            },
            function (err) {
                console.error("[Tutorial] Error in getDocumentInfo:", err);
            }
        ).done();
    }

    /**
     * 获取指定文档图片
     * @param documentId
     * @param bounds
     * @return {Promise<Pixmap|null>}
     */
    async function getImage(documentId, bounds) {
        try {
            var pixmap = await _generator.getDocumentPixmap(documentId, {
                clipToDocumentBounds: true,
                inputRect: bounds,
                outputRect: bounds,
                clipBounds: bounds,
                scaleX: 1,
                scaleY: 1,
                convertToWorkingRGBProfile: true,
                maxDimension: 30000,
            });
            //console.log(pixmap);
            return pixmap;
        } catch (e) {
            console.error(`get document pixmap error[${e}]`);
            return null;
        }
    }

    /**
     * 保存pixmap图片到本地
     * @param pixmap
     * @param documentId
     */
    async function saveImageToPNG(pixmap, documentId) {
        return new Promise((resolve, reject) => {
            var Jimp = require('jimp')
            var offset = 0;
            var image = new Jimp(pixmap.width, pixmap.height, function (err, image) {
                let buffer = image.bitmap.data;
                for (let i = 0; i < pixmap.pixels.length; i++) {
                    buffer[offset] = pixmap.pixels[offset + 1]    // R
                    buffer[offset + 1] = pixmap.pixels[offset + 2]    // G
                    buffer[offset + 2] = pixmap.pixels[offset + 3]    // B
                    buffer[offset + 3] = pixmap.pixels[offset]  // Alpha
                    offset = offset + pixmap.channelCount;
                }

                // const os = require('os');
                // const homedir = os.homedir();
                const fs = require("fs");
                const path = require("path");
                const output = path.join(save_path, 'process_images', Date.now() + '.png');
                console.log(`image save to[${output}]`);
                image.write(output);
                // console.log('ok');
                resolve(output);
            });
        });
    }


    // 对外暴露init方法，提供给generator-builtin调用
    exports.init = init;
}())
