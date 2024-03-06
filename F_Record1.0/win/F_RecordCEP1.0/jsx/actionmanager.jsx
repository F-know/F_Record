/**
 * 这个函数接受一个AD的对象，返回这个对象所有属性值的JSON结构
 * @param desc [ActionDescriptor]
 * @constructor
 * @return JSON
 */
function ADToJson(desc) {
    var json = {};
    for (var i=0; i<desc.count; i++) {
        var typeID = desc.getKey(i);
        var stringID = typeIDToStringID(typeID);
        var typeString = (desc.getType(typeID)).toString();
        $.writeln(stringID + "=> " + typeString);
        switch(typeString) {
            case "DescValueType.BOOLEANTYPE": 
                json[stringID] = desc.getBoolean(typeID);
            break;
            case "DescValueType.DOUBLETYPE": 
                json[stringID] = desc.getDouble(typeID);
            break;
            case "DescValueType.INTEGERTYPE": 
                json[stringID] = desc.getInteger(typeID);
            break;
            case "DescValueType.STRINGTYPE": 
                json[stringID] = desc.getString(typeID);
            break;
            case 'DescValueType.OBJECTTYPE':
                var objectValue = desc.getObjectValue(typeID);
                json[stringID] = ADToJson(objectValue);
		    break;
            case 'DescValueType.CLASSTYPE':
            case 'DescValueType.LISTTYPE':
            case 'DescValueType.REFERENCETYPE':
                // 剩下这些留给你去补充完成
		    break;
            default: ; break;
        }
    }
    return json;
}

/**
 * 根据图层ID来获取图层信息
 * @param layerID
 * @return {*}
 */
function getLayerInfoByID(layerID) {
    var ref1 = new ActionReference();
        ref1.putIdentifier(stringIDToTypeID( "layerID", layerID));
    var layerDescriptor = executeActionGet(ref1);
    var json = ADToJson(layerDescriptor);   
    return json;
}

/**
 * 根据图层的顺序，来获取图层信息
 * @param index
 * @return {*}
 */
function getLayerInfoByIndex(index) {
    var ref1 = new ActionReference();
        ref1.putIndex( stringIDToTypeID( "itemIndex" ), index); 
    var layerDescriptor = executeActionGet(ref1);
    var json = ADToJson(layerDescriptor);
    return json;   
}


/**
 * 根据图层的名称，来获取图层信息
 * @param index
 * @return {*}
 */
function getLayerInfoByName(name) {
    var ref1 = new ActionReference();
    ref1.putName( stringIDToTypeID( "layer" ), name );
    var layerDescriptor = executeActionGet(ref1);
    var json = ADToJson(layerDescriptor);
    return json
}


function getCurrentDocumentInfo() {
    var ref1 = new ActionReference();
    ref1.putEnumerated(charIDToTypeID('Dcmn'), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
    var docDescriptor = executeActionGet(ref1);
    var json = ADToJson(docDescriptor);
    return json
}

//var doc = getCurrentDocumentInfo();
//$.writeln(doc.title);
//var json = ADToJson(desc);

/*
var ref1 = new ActionReference();
ref1.putEnumerated(stringIDToTypeID('application'), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
var appDesc = executeActionGet(ref1);
var currentToolOptions = appDesc.getObjectValue(stringIDToTypeID("currentToolOptions"));
var textTool = currentToolOptions.getObjectValue(stringIDToTypeID("textToolCharacterOptions"));
var style = textTool.getObjectValue(stringIDToTypeID("textStyle"))
var fontName = style.getString(stringIDToTypeID("fontName"));
var fontStyleName = style.getString(stringIDToTypeID("fontStyleName"));
var fontPostScriptName = style.getString(stringIDToTypeID("fontPostScriptName"));
$.writeln(fontName + " - " + fontStyleName + " - " + fontPostScriptName);
*/

// 创建一个textStyle的AD，给它重新赋值
var textStyle = new ActionDescriptor();
    textStyle.putString(stringIDToTypeID("fontName"), "Consolas");
    textStyle.putString(stringIDToTypeID("fontStyleName"), "Regular");
    textStyle.putString(stringIDToTypeID("fontPostScriptName"), "Consolas");

// 创建一个textToolCharacterOptions的AD，将textStyle赋值给它
var textToolCharacterOptions = new ActionDescriptor();
textToolCharacterOptions.putObject(stringIDToTypeID("textStyle"), stringIDToTypeID("textStyle"), textStyle);

// 创建一个currentToolOptions的AD，将textToolCharacterOptions赋值给它
var currentToolOptions = new ActionDescriptor();
currentToolOptions.putObject(stringIDToTypeID("textToolCharacterOptions"), stringIDToTypeID("textToolCharacterOptions"), textToolCharacterOptions);
// 将currentToolOptions赋值给文字工具
var desc1 = new ActionDescriptor();
    var ref1 = new ActionReference();
        ref1.putClass(stringIDToTypeID('typeCreateOrEditTool'));    // 文字工具这个目标对象
desc1.putReference( stringIDToTypeID( "null" ), ref1 );
desc1.putObject( stringIDToTypeID( "to" ), stringIDToTypeID( "null" ), currentToolOptions);
executeAction( stringIDToTypeID( "set" ), desc1, DialogModes.NO );



