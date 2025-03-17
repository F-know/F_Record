if(typeof($)=='undefined') {
    $={};
}

$.f_record = {
    generateFinalJPG: function(finalJPGPath) {
        finalJPGPath = decodeURIComponent(finalJPGPath);
        var jpegOption = new ExportOptionsSaveForWeb();
        jpegOption.format = SaveDocumentType.JPEG;
        jpegOption.optimized = true;
        jpegOption.quality = 100;
        var file = new File(finalJPGPath);
        app.activeDocument.exportDocument(file, ExportType.SAVEFORWEB, jpegOption);
    },

    showError: function(error) {
        Window.alert(decodeURIComponent(error), "F_Record");
    }
}