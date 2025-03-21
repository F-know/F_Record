import path from 'path-browserify';

//@ts-ignore
export const F_Record_Dir = path.join(getUserDirectory(), "F_Record");
export const configDataFilePath = path.join(F_Record_Dir, 'configData.json');
export const nowDocumentFilePath = path.join(F_Record_Dir, "nowDocument.json");
export const documentValueFolderPath = path.join(F_Record_Dir, "documentValues");
export const exportTempFolderPath = path.join(F_Record_Dir, "exportTemp");
export const finalJPGPath = path.join(exportTempFolderPath, "finalJPG.jpg");

export const FPS = 25;