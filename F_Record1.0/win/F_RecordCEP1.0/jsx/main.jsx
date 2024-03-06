
try {
    var xLib = new ExternalObject("lib:\PlugPlugExternalObject");
} catch (e) {
    alert(e.toString());
}


if(typeof($)=='undefined') {
    $={};
}

// 获取当前选中图层的名称
function getActiveLayerName(params) {
    alert(params);
    var doc = app.activeDocument;
    return doc.activeLayer.name;
}

function jsxToJs() {
    dispatch('message from jsx');
}

$._ext = {
    sendToGenerator: function (param) {
        try {
            var generatorDesc = new ActionDescriptor();
            generatorDesc.putString(stringIDToTypeID("name"), "F_Record 1.0");
            generatorDesc.putString(stringIDToTypeID("sampleAttribute"), param);
            executeAction(stringIDToTypeID("generateAssets"), generatorDesc, DialogModes.NO);
        } catch (e) {
        }

    }
};



// 事件派发函数
function dispatch(message) {
    var eventObj = new CSXSEvent();
    eventObj.type = "my_custom_event_type";
    eventObj.data = '[CSXSEvent] ' + message + '';
    eventObj.dispatch()
}

var console = {
    log: function(message) {
        var eventObj = new CSXSEvent();
        eventObj.type = "console_log_event";
        eventObj.data = '[JSXLog] ' + message + '';
        eventObj.dispatch();
    }
};
