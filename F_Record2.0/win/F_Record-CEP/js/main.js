
var csInterface = new CSInterface();
var appId = csInterface.getApplicationID();
var extId = csInterface.getExtensionID();
var selectEventId = 0;
const fs = require("fs");
const path = require('path');

function syncTheme() {
    
    var theme = getTheme();
    var link = document.getElementById('theme-link');
    link.href=`./css/topcoat/topcoat-desktop-${theme}.min.css`;
    var elements = document.getElementsByTagName('label');
    
    for(var i=0;i<elements.length;i++){
        var e=elements[i];
        if(theme == 'darkest' || theme == 'dark'){
            e.style.color = 'white';
        }else{
            e.style.color = 'black';
        }
    }
    elements = document.getElementsByTagName('span');
    for(var i=0;i<elements.length;i++){
        e=elements[i];
        if(theme == 'darkest' || theme == 'dark'){
            e.style.color = 'white';
        }else{
            e.style.color = 'black';
        }
    }
}

function getTheme() {
    var hostEnv = csInterface.getHostEnvironment();
    var bgColor = hostEnv.appSkinInfo.appBarBackgroundColor;
    var red = Math.round(bgColor.color.red);
    var green = Math.round(bgColor.color.green);
    var blue = Math.round(bgColor.color.blue);
    var theme;
    if (red < 60) {
        theme = 'darkest';
    } else if (60 <= red && red < 127) {
        theme = 'dark';
    } else if (127 <= red && red < 200) {
        theme = 'gray';
    } else {
        theme = 'white';
    }
    return theme;
}

// 处理生成器发送过来的消息
function handleEventFromGenerator(event) {
    const ret = event.data;
    if('imageChanged' in ret){
        loadImageCount();
    }else if('recordStatus' in ret){
        if(ret.recordStatus){
            startOrStopRecord();
        }
    }
}

function startOrStopRecord() {
    // 启动生成器开始实时录制
    const btn =document.getElementById("start-btn");
    // btn.style.display = 'none';
    if(btn.classList.contains('topcoat-button--cta')){
        try{
            fs.readdirSync(localStorage['savePath']);
        }catch(error){
            alert('没找到这个路径');
            return;
        }
        csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'start-record'})}')`);
        btn.classList.remove('topcoat-button--cta');
        btn.innerHTML = '停止录制';
        document.getElementById("clear-btn").style.display='none';
        document.getElementById("output-btn").style.display='none';
    }else{
        csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'stop-record'})}')`);
        btn.classList.add('topcoat-button--cta');
        if(document.getElementById("imageCount").innerHTML=="0"){
            btn.innerHTML = '开始录制';
        }else{
            btn.innerHTML = '继续录制';
        }
        document.getElementById("clear-btn").style.display='inline';
        document.getElementById("output-btn").style.display='inline';
    }
}

function updateSavePath(){
    localStorage["savePath"]=document.getElementById("savePath").value;
    csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'update-save-path', value: encodeURIComponent(localStorage["savePath"])})}')`);
    loadImageCount();
}

function updateMinRecordInterval(){
    setIntInputMinMax('minRecordInterval',0,100000);
    localStorage["minRecordInterval"]=document.getElementById("minRecordInterval").value;
    csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'update-min-record-interval', value: parseFloat(localStorage["minRecordInterval"])})}')`);
}

function updateVideoDuration(){
    setIntInputMinMax('videoDuration',1,100000);
    localStorage["videoDuration"]=document.getElementById("videoDuration").value;
}

function loadImageCount(){
    
    const save_path = localStorage['savePath'];
    if(!fs.existsSync(save_path))return;
    const imageFiles = [];
    const imageDirectory = path.join(save_path,'/process_images');
    if(fs.existsSync(imageDirectory)){
        const files = fs.readdirSync(imageDirectory);
        for (var i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.endsWith('.jpg')||file.endsWith('.jpeg')) {
                imageFiles.push(file);
            }
        }
    }
    
    document.getElementById("imageCount").innerHTML=imageFiles.length;
    if(document.getElementById("start-btn").classList.contains('topcoat-button--cta')){
        if(imageFiles.length == 0){
            document.getElementById("start-btn").innerHTML="开始录制";
        }
        else{
            document.getElementById("start-btn").innerHTML="继续录制";
        }
    }
}

async function outputVideo(){
    
    const ffmpeg = require('fluent-ffmpeg');
    var ffmpegPath = path.join(__dirname,'node_modules','@ffmpeg-installer','win32-x64',process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    var ffprobePath = path.join(__dirname,'node_modules','@ffmpeg-installer','win32-x64',process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
    // 设置ffmpeg路径
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);

    try{
        fs.readdirSync(localStorage['savePath']);
    }catch(error){
        alert('没找到这个路径');
        return;
    }
    const save_path = localStorage['savePath'];

    // 要处理的图片目录
    const imageDirectory = path.join(save_path,'process_images');
    if(!fs.existsSync(imageDirectory)){
        fs.mkdirSync(imageDirectory);
    }
    const imageFiles = [];
    const files_ = fs.readdirSync(imageDirectory);
    for (var i = 0; i < files_.length; i++) {
        const file = files_[i];
        if (file.endsWith('.jpg')||file.endsWith('.jpeg')) {
            imageFiles.push(file);
        }
    }
    
    // 生成的视频文件名
    const outputDirectory = path.join(save_path,'output_videos');
    if(!fs.existsSync(outputDirectory)){
        fs.mkdirSync(outputDirectory);
    }
    const tmpDirectory = path.join(save_path,'tmp_files');
    const tmpDirectory0 = path.join(tmpDirectory,'0');
    const tmpDirectory1 = path.join(tmpDirectory,'1');
    const tmpDirectory2 = path.join(tmpDirectory,'2');
    if(!fs.existsSync(tmpDirectory)){
        fs.mkdirSync(tmpDirectory);
    }
    function clearTmp(){
        for(var i=0;i<3;i++){
            if(!fs.existsSync(path.join(tmpDirectory,''+i))){
                fs.mkdirSync(path.join(tmpDirectory,''+i));
            }
            const files = fs.readdirSync(path.join(tmpDirectory,''+i));
            for(const file of files) {
                const filePath = path.join(tmpDirectory,''+i,file);
                if (path.extname(file).toLowerCase() === '.mp4') {
                    fs.unlinkSync(filePath);
                }
            }
        }
    }
    clearTmp();
    

    
    if(localStorage['videoDuration']==''){
        alert("填一下录像时长呗");
        return;
    }
    if(imageFiles.length == 0){
        alert("啥也没有啊，我还能帮你画？");
        return;
    }
    if(imageFiles.length == 917){//magic number
        if(Math.random()<0.5){
            alert("祝好~");
        }
    }
    const jpeg = require('jpeg-js');
    const lastImageData=jpeg.decode(fs.readFileSync(path.join(imageDirectory,imageFiles[imageFiles.length-1])));
    var videoWidth = lastImageData.width;
    var videoHeight = lastImageData.height;
    var videoDuration = parseFloat(localStorage['videoDuration']);
    videoWidth = Math.floor(videoWidth);
    if(videoWidth % 2 === 1){
        videoWidth = videoWidth + 1;
    }
    videoHeight = Math.floor(videoHeight);
    if(videoHeight % 2 === 1){
        videoHeight = videoHeight + 1;
    }
    var imageInterval = videoDuration/imageFiles.length;
    const sn=100;

    const tot=Math.floor((imageFiles.length+sn)/sn);
    var tot_now=0;

    const btn = document.getElementById("output-btn");
    btn.style.pointerEvents='none';
    btn.classList.remove('topcoat-button--cta');
    btn.innerHTML = Math.min(90,Math.floor((tot_now/tot)*100))+'%';
    document.getElementById("clear-btn").style.pointerEvents='none';
    document.getElementById("start-btn").style.pointerEvents='none';

    try{
        
        var tmpFiles=null;
        async function output_0(p){
            if(p == imageFiles.length){
                return;
            }
            const tempVideo = path.join(tmpDirectory0,'temp'+Date.now()+'.mp4');
            const outputVideo = path.join(tmpDirectory0,Date.now()+'.mp4');
            const q=Math.min(p+sn,imageFiles.length);
            const duration = ((q-p)*imageInterval);
            async function lalala(){
                return new Promise(function(resolve, reject) {
                    ffmpeg()
                    .input('color=c=black:s=' + videoWidth + 'x' + videoHeight) // 使用黑色作为输入
                    .inputFormat('lavfi')
                    .inputOptions('-t ' + duration) // 设置时长
                    .save(tempVideo)
                    .on('error', function(error) {
                        reject(error.message);
                    })
                    .on('end', function() {
                        resolve();
                    })
                })
            }
            await lalala();
            let baseInput=ffmpeg().input(tempVideo);
            for(let i=p;i<q;i++){
                baseInput=baseInput.input(path.join(imageDirectory, imageFiles[i]));
            }
            let complexFilter = `[0:v]scale=w=${videoWidth}:h=${videoHeight}[videobase];`;
            for (let i = 0; i < q-p; i++) {
                complexFilter+=`[${i + 1}:v]scale=w='iw*min(${videoWidth}/iw,${videoHeight}/ih)':h='ih*min(${videoWidth}/iw,${videoHeight}/ih)'[img${i + 1}];`;
            }
            for (let i = 0; i < q-p; i++) { // 输入图片的动画控制
                let t1 = ((i) * imageInterval).toFixed(2);
                let t2 = ((i+1) * imageInterval).toFixed(2);
                if (i === 0) {
                    complexFilter+= `[videobase][img${i + 1}]overlay='main_w/2-overlay_w/2':'if(gte(t, ${t1}), if(gte(t, ${t2}),main_h,main_h/2-overlay_h/2), main_h)'${i === q-p - 1 ? '' : `[a${i}];`}`;
                } else {
                    complexFilter+= `[a${i - 1}][img${i + 1}]overlay='main_w/2-overlay_w/2':'if(gte(t, ${t1}), if(gte(t, ${t2}),main_h,main_h/2-overlay_h/2), main_h)'${i === q-p - 1 ? '' : `[a${i}];`}`;
                }
            }
            async function lalalala(){
                return new Promise(function(resolve, reject) {
                    baseInput
                    .complexFilter(
                        [complexFilter]
                    )
                    .videoBitrate('2048k')
                    .duration(videoDuration)
                    .save(outputVideo)
                    .on('end', () => {
                        resolve();
                    })
                    .on('error', (error) => {
                        reject(error.message);
                    })
                })
            }
            await lalalala();
            fs.unlinkSync(tempVideo);

            tot_now+=1;
            btn.innerHTML = Math.min(90,Math.floor((tot_now/tot)*100))+'%';
            
            await output_0(q);
        }
        async function output_1(p){
            if(p == tmpFiles.length){
                return;
            }
            const outputVideo = path.join(tmpDirectory1,Date.now()+'.mp4');
            const q=Math.min(p+sn,tmpFiles.length);
            const baseInput=ffmpeg();
            for(let i=p;i<q;i++){
                baseInput.input(path.join(tmpDirectory0, tmpFiles[i]));
            }
            async function lalala(){
                return new Promise(function(resolve, reject) {
                    baseInput
                    .mergeToFile(outputVideo)
                    .on('error', function(error) {
                        reject(error.message);
                    })
                    .on('end', function() {
                        resolve();
                    })
                })
            }
            await lalala();
            await output_1(q);
        }
        async function output_2(p){
            if(p == tmpFiles.length){
                return;
            }
            const outputVideo = path.join(tmpDirectory2,Date.now()+'.mp4');
            const q=Math.min(p+sn,tmpFiles.length);
            const baseInput=ffmpeg();
            for(let i=p;i<q;i++){
                baseInput.input(path.join(tmpDirectory1, tmpFiles[i]));
            }
            async function lalala(){
                return new Promise(function(resolve, reject) {
                    baseInput
                    .mergeToFile(outputVideo)
                    .on('error', function(error) {
                        reject(error.message);
                    })
                    .on('end', function() {
                        resolve();
                    })
                })
            }
            await lalala();
            await output_2(q);
        }
        async function output_3(p){
            const outputVideo = path.join(outputDirectory,Date.now()+'.mp4');
            const q=Math.min(p+sn,tmpFiles.length);
            const baseInput=ffmpeg();
            for(let i=p;i<q;i++){
                baseInput.input(path.join(tmpDirectory2, tmpFiles[i]));
            }
            async function lalala(){
                return new Promise(function(resolve, reject) {
                    baseInput
                    .mergeToFile(outputVideo)
                    .on('error', function(error) {
                        reject(error.message);
                    })
                    .on('end', function() {
                        resolve();
                    })
                })
            }
            await lalala();
            if(imageFiles.length < 1000){
                alert(`成功生成录像${outputVideo}`);
            }else{
                alert(`很荣幸见证旷世之作诞生的全过程${outputVideo}`);
            }
        }
        await output_0(0);
        tmpFiles = fs.readdirSync(tmpDirectory0).filter(file => file.endsWith('.mp4'));
        await output_1(0);
        tmpFiles = fs.readdirSync(tmpDirectory1).filter(file => file.endsWith('.mp4'));
        btn.innerHTML = 93 + '%';
        await output_2(0);
        tmpFiles = fs.readdirSync(tmpDirectory2).filter(file => file.endsWith('.mp4'));
        btn.innerHTML = 96 + '%';
        await output_3(0);
    }catch(error){
        alert(error.message);
    }finally{
        btn.style.pointerEvents='auto';
        btn.classList.add('topcoat-button--cta');
        btn.innerHTML = "输出录像";
        document.getElementById("clear-btn").style.pointerEvents='auto';
        document.getElementById("start-btn").style.pointerEvents='auto';
        clearTmp();
    }
}

function clearProcessImages(){

    var result = confirm("确认要清除录制过程？\n如果已经输出录像，先确保视频效果满意");
    if(!result){
        return;
    }
    const save_path = localStorage['savePath'];
    try{
        fs.readdirSync(save_path);
    }catch(error){
        alert('没找到这个路径');
        return;
    }
    const imageDirectory = path.join(save_path,'process_images');
    try{
        fs.readdirSync(imageDirectory);
    }catch(error){
        alert('啥也没有，清了个寂寞');
        return;
    }
    const files = fs.readdirSync(path.join(save_path,'process_images'));
    if(files.length == 0){
        alert("啥也没有，清了个寂寞");
        return;
    }
    const btn = document.getElementById("clear-btn");
    btn.style.pointerEvents='none';
    btn.classList.remove('topcoat-button--cta')
    btn.innerHTML = "正在清除"
    for(const file of files) {
        const filePath = path.join(save_path,'process_images',file);
        if (path.extname(file).toLowerCase() === '.jpg') {
            fs.unlinkSync(filePath);
        }
    }
    loadImageCount();
    alert("已清空");
    btn.style.pointerEvents='auto';
    btn.classList.add('topcoat-button--cta');
    btn.innerHTML = "清空过程"
}

function loadUserInfo(){
    
    if(localStorage['savePath'] === undefined){
        localStorage['savePath'] = '';
    }
    if(localStorage['minRecordInterval'] === undefined){
        localStorage['minRecordInterval'] = '0';
    }
    if(localStorage['videoDuration'] === undefined){
        localStorage['videoDuration'] = '';
    }
    document.getElementById("savePath").value = localStorage['savePath'];
    csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'update-save-path', value: encodeURIComponent(localStorage["savePath"])})}')`);
    document.getElementById("minRecordInterval").value = localStorage['minRecordInterval'];
    csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'update-min-record-interval', value: parseFloat(localStorage["minRecordInterval"])})}')`);
    
    document.getElementById("videoDuration").value = localStorage['videoDuration'];
    loadImageCount();
    csInterface.evalScript(`$._ext.sendToGenerator('${JSON.stringify({from: 'panel', action: 'get-record-status'})}')`);
}

function setIntInputMinMax(id,mn,mx){
    const input_ = document.getElementById(id);
    if (input_.value !== '') {
        input_.value = Math.floor(input_.value);
        // alert(input_.value);
        // 判断是否超过最大值
        if (input_.value > mx) {
            input_.value = mx;
        }
        else if(input_.value < mn) {
            input_.value = mn;
        }
    }else if(id == "minRecordInterval"){
        input_.value = 0;
    }
}

window.addEventListener('load', function(){
    /*持久化*/
    const event = new CSEvent("com.adobe.PhotoshopPersistent", "APPLICATION");
    event.extensionId = extId;
    csInterface.dispatchEvent(event);

    syncTheme();
    csInterface.addEventListener('com.adobe.csxs.events.ThemeColorChanged', function(){
        syncTheme();
    });
    csInterface.addEventListener('com.generator.plugin.demo', handleEventFromGenerator);

    loadUserInfo()


});
