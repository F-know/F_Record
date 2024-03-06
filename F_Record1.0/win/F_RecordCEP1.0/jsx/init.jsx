
if(typeof($)=='undefined') {
    $={};
}

try {
    var xLib = new ExternalObject("lib:\PlugPlugExternalObject");
} catch (e) {
    alert(e.toString());
}

$._ext = {
    evalFile : function(path) {
        try {
            //$._ext.dispatch("eval file: " + path);
            $.evalFile(path);
            return 0;
        } catch (e) {
            alert("Cutterman Exception:" + e.toString() + "; path: " + path);
            return 1;
        }
    },
    evalFiles: function(extensionDir) {
        var files = [];
        var jsxDir = new Folder(extensionDir + '/Panel/jsx');
        if (jsxDir.exists) {
            files = files.concat(jsxDir.getFiles("*.jsx"));
        }
        var errno = 0;
        for(var i=0; i<files.length; i++) {
            if (!/init.jsx/.test(files[i])) {
                errno = $._ext.evalFile(files[i]);
            }
        }
        return "{\"errno\": " + errno + "}";
    },
    dispatch: function(message) {
        var eventObj = new CSXSEvent();
        eventObj.type = "DevToolsConsoleEvent";
        eventObj.data = '[DEBUG] [MSG: ' + message + ']';
        eventObj.dispatch()
    },
    sendToGenerator: function (param) {
        try {
            alert(param);
            var generatorDesc = new ActionDescriptor();
            generatorDesc.putString (stringIDToTypeID("name"), "F_Record 1.0");
            generatorDesc.putString (stringIDToTypeID("sampleAttribute"), param);
            executeAction (stringIDToTypeID("generateAssets"), generatorDesc, DialogModes.NO);
        } catch (e) {
        }
    }
};
