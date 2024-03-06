
/**
 * @description 图层模块，基本功能封装
 * @author xiaoqiang
 * @date 2021/01/15
 */

 function Layer(id) {
     this.id = id;
 }

// --------- 实例方法 -----------------
/**
 * 获取当前实例图层的名称
 * @return {string}
 */
Layer.prototype.name = function() {
    var layerReference = new ActionReference();
        layerReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Nm  "));
        layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var descriptor = executeActionGet(layerReference);
    return descriptor.getString(charIDToTypeID("Nm  "));
} 

 /**
 * 获取当前实例图层的层级
 * @return {number}
 */
Layer.prototype.index = function () {
    var layerReference = new ActionReference();
        layerReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("ItmI"));
        layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var descriptor = executeActionGet(layerReference);
    return descriptor.getInteger(charIDToTypeID("ItmI"));
}

/**
 * 获取当前实例图层的类型
 * @return {number}
 */
Layer.prototype.kind = function () {
    var layerReference = new ActionReference();
    layerReference.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("layerKind"));
    layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var descriptor = executeActionGet(layerReference);
    return descriptor.getInteger(stringIDToTypeID("layerKind"));
}

/**
 * 获取当前实例图层的尺寸
 * @return {{x: number, width: number, y: number, height: number}}
 */
Layer.prototype.bounds = function () {
    var layerReference = new ActionReference();
        layerReference.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("bounds"));
        layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var layerDescriptor = executeActionGet(layerReference);
    var rectangle = layerDescriptor.getObjectValue(stringIDToTypeID("bounds"));
    var left = rectangle.getUnitDoubleValue(charIDToTypeID("Left"));
    var top = rectangle.getUnitDoubleValue(charIDToTypeID("Top "));
    var right = rectangle.getUnitDoubleValue(charIDToTypeID("Rght"));
    var bottom = rectangle.getUnitDoubleValue(charIDToTypeID("Btom"));
    return {x: left, y: top, width: (right - left), height: (bottom - top)};
}

/**
 * 判断当前图层的显示/隐藏
 * @return {boolean}
 */
Layer.prototype.visible = function () {
    var layerReference = new ActionReference();
        layerReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Vsbl"));
        layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var descriptor = executeActionGet(layerReference);
    if(descriptor.hasKey(charIDToTypeID("Vsbl")) == false) return false;
    return descriptor.getBoolean (charIDToTypeID("Vsbl"));
}

/**
 * 获取形状图层的填充颜色
 * @return {null|*[]}
 */
Layer.prototype.solidFill = function () {
    var kind = this.kind();
    if (kind === 4) { // 只有形状图层才能获取到图层填充属性
        var layerReference = new ActionReference();
            // 形状图层的填充和其它属性在adjuestment下面
            layerReference.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("adjustment"));
            layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
        var descriptor = executeActionGet(layerReference);
        var adjustment = descriptor.getList(stringIDToTypeID("adjustment"));    // adjustment是一个ActionList
        var result = [];
        for (var i = 0;  i < adjustment.count; i++) {
            var item = adjustment.getObjectValue(i);
            var color = item.getObjectValue(stringIDToTypeID("color"));
            var red = color.getInteger(stringIDToTypeID("red"));
            var green = color.getInteger(stringIDToTypeID("grain"));
            var blue = color.getInteger(stringIDToTypeID("blue"));
            result.push({"red": red, "green": green,  "blue": blue});
        }
        return result;
    }
    return null;
}

/**
 * 获取图层描边效果
 * @return {{size: *, color: {red: *, green: *, blue: *}, opacity: *}|null}
 */
Layer.prototype.strokeFx = function () {
    var layerReference = new ActionReference();
        // 所有的图层效果，都在layerEffects下面
        layerReference.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("layerEffects"));
        layerReference.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var descriptor = executeActionGet(layerReference);
    var layerEffects = descriptor.getList(stringIDToTypeID("layerEffects"));
    var frameFX = layerEffects.getObjectValue(stringIDToTypeID("frameFX"));
    var enabled = frameFX.getBoolean(stringIDToTypeID("enabled"));
    if (enabled) {
        var size = frameFX.getInteger(stringIDToTypeID("size"));
        var opacity = frameFX.getInteger(stringIDToTypeID("opacity"));
        var color = frameFX.getObjectValue(stringIDToTypeID("color"));
        var red = color.getInteger(stringIDToTypeID("red"));
        var green = color.getInteger(stringIDToTypeID("grain"));
        var blue = color.getInteger(stringIDToTypeID("blue"));
        return {
            size: size,
            opacity: opacity,
            color: {red: red, green: green, blue: blue}
        }
    } 
    return null;
}


/**
 * 选中当前实例图层
 */
Layer.prototype.select = function () {
    var current = new ActionReference();
        current.putIdentifier(charIDToTypeID("Lyr "), this.id);
    var desc  = new ActionDescriptor();
    desc.putReference (charIDToTypeID("null"), current);
    executeAction( charIDToTypeID( "slct" ), desc , DialogModes.NO );
}

/**
 * 显示当前实例对象图层
 */
Layer.prototype.show = function () {
    var desc1 = new ActionDescriptor();
    var list1 = new ActionList();
    var ref1 = new ActionReference();
        ref1.putIdentifier(charIDToTypeID("Lyr "), this.id);;
        list1.putReference(ref1);
    desc1.putList(charIDToTypeID("null"), list1);
    executeAction(charIDToTypeID("Shw "), desc1, DialogModes.NO);
}


/**
 * 隐藏当前实例对象图层
 */
Layer.prototype.hide = function () {
    var current = new ActionReference();
    var desc242 = new ActionDescriptor();
    var list10 = new ActionList();
    current.putIdentifier(charIDToTypeID("Lyr "), this.id);;
    list10.putReference( current );
    desc242.putList( charIDToTypeID( "null" ), list10 );
    executeAction( charIDToTypeID( "Hd  " ), desc242, DialogModes.NO );
}

/**
 * 栅格化当前实例图层
 */
Layer.prototype.rasterize = function () {
    var desc7 = new ActionDescriptor();
    var ref4 = new ActionReference();
    ref4.putIdentifier(charIDToTypeID("Lyr "), this.id);
    desc7.putReference( charIDToTypeID( "null" ), ref4 );
    executeAction( stringIDToTypeID( "rasterizeLayer" ), desc7, DialogModes.NO );
}

/**
 * 修改图层名称
 * @param newNameString
 */
Layer.prototype.setName = function (newNameString) {
    var desc26 = new ActionDescriptor();
    var ref13 = new ActionReference();
        // 只能对当前选中的图层操作
        ref13.putEnumerated( charIDToTypeID( "Lyr " ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Trgt" ));
    desc26.putReference( charIDToTypeID( "null" ), ref13 );
    var desc27 = new ActionDescriptor();
        desc27.putString( charIDToTypeID( "Nm  " ), newNameString);
    desc26.putObject( charIDToTypeID( "T   " ), charIDToTypeID( "Lyr " ), desc27 );
    executeAction( charIDToTypeID( "setd" ), desc26, DialogModes.NO );
}


// --------- 类方法 -----------------
/**
 * 获取选中的图层列表
 * @return Layer[]
 */
Layer.getSelectedLayers = function() {
    var targetLayersTypeId = stringIDToTypeID("targetLayersIDs");
    var selectedLayersReference = new ActionReference();
    selectedLayersReference.putProperty(charIDToTypeID("Prpr"), targetLayersTypeId);
    selectedLayersReference.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var desc = executeActionGet(selectedLayersReference);
    var layers = [];
    if (desc.hasKey(targetLayersTypeId)) {
        // have selected layers
        var list = desc.getList(targetLayersTypeId);
        for (var i=0; i<list.count; i++) {
            var ar = list.getReference(i);
            var layerId = ar.getIdentifier();
            layers.push(new Layer(layerId));
        }
    }

    // WIN CC2019的情况下，默认一个背景图层，会获取到ID是0
    if (layers.length === 1 && layers[0].id === "0") {
        layers = [];
        selectedLayersReference = new ActionReference();
        selectedLayersReference.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("LyrI"));
        selectedLayersReference.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var descriptor = executeActionGet(selectedLayersReference);
        var id = descriptor.getInteger(charIDToTypeID("LyrI"));
        layers.push(new Layer(id));
    }

    return layers;
}

/**
 * 根据名称获取图层
 */
Layer.getLayersByName = function() {
    try {
        var ref = new ActionReference();
        ref.putName(charIDToTypeID("Lyr "), name);
        var layerDesc = executeActionGet(ref)
        var layerId = layerDesc.getInteger(charIDToTypeID('LyrI'));
        return new Layer(layerId);
    } catch (e) {
        $.writeln(e.toSting());
        return null;
    }
}


/**
 * 高效的遍历图层方法
 */
Layer.loopLayers = function(callback) {
    var ref = new ActionReference();
        // 当前文档的图层数量属性key
        ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID('NmbL'));
        ref.putEnumerated( charIDToTypeID('Dcmn'), charIDToTypeID('Ordn'), charIDToTypeID('Trgt') );
    var desc = executeActionGet(ref);    
    var layerCount = desc.getInteger(charIDToTypeID('NmbL'));
    $.writeln("count: " + layerCount);
    // 索引起始值，会受是否有背景图层影响，需要做一下处理
    var i = 0;
    try {
        activeDocument.backgroundLayer;
    } catch(e) {
        i = 1;
    }
    // 开始逐级遍历图层index，根据index来获取到图层实例
    for (i; i<layerCount; i++) {
        var ref = new ActionReference();
            ref.putIndex( charIDToTypeID( 'Lyr ' ), i );
        var desc = executeActionGet(ref);
        var id = desc.getInteger(stringIDToTypeID( 'layerID' ));
        var layer = new Layer(id);
        // 根据需要进行操作
        callback && callback(layer)
    }
}
