# Introduction to F_Record

A lightweight Photoshop plugin used to record drawing processes.

https://github.com/user-attachments/assets/0221cee9-ac70-48d1-b85a-b85667813b90

**Plugin Principle**: It uses Photoshop's Generator interface. Whenever there is a change on the canvas, it captures a snapshot. In the end, these snapshots are combined into a single video.

**Current Plugin Version**: 3.0

**Supported Operating Systems**: Windows 

**Supported Photoshop Versions**: Photoshop 2022 ~ 2025

## Installation

1. Download the plugin zip file [F_Record.zip](https://github.com/F-know/F_Record/releases/download/3.0/F_Record.zip), extract it, and open the folder.

2. Inside, you will find two folders: `com.f_know.f_record.cep` and `com.f_know.f_record.generator`. Copy them into the corresponding locations in your main Photoshop directory.  
   The main Photoshop directory typically looks like `D:\Adobe Photoshop 2022`.  
   You can tell if it’s the correct directory if you see the Photoshop executable `Photoshop.exe` (not a shortcut).

   - Place the `com.f_know.f_record.cep` folder in the path similar to `D:\Adobe Photoshop 2022\Required\CEP\extensions`.
   - Place the `com.f_know.f_record.generator` folder in the path similar to `D:\Adobe Photoshop 2022\Plug-ins\Generator`.

   Note: If your Photoshop installation is missing a certain subfolder (like `Generator` under `Plug-ins`), you may need to create it manually.

3. Open Photoshop, then go to **Edit → Preferences → Plugins**. Check whether **Enable Generator** and **Load Extension Panels** are selected.  
   - If they are not checked, select them and restart Photoshop.  
   - If they are already checked, there’s no need to restart.

4. Finally, go to **Window → Extensions (legacy)** in Photoshop. You should see the plugin listed there. Click on it to start using it.

## Usage Instructions

1. For first-time use, toggle on the plugin. Once activated, it will automatically record your drawing process. For each different document, the process is saved in a separate folder. You can close or hide the plugin panel; when you restart Photoshop, the plugin automatically starts in the background to keep recording.

2. It’s recommended to set up a folder path for saving the process images in the Settings. The default path is on the C drive. You may want to change it to a location with sufficient space. It’s not recommended to change this path in the middle of a drawing process. If you really need to, you must manually move all snapshots from the old path to the new one.

3. The default resolution and quality settings are usually enough for basic needs. The higher you set them, the better the final video quality will be—but the more space the images will occupy. If your computer has plenty of free space, you can set them to the highest values. A friendly reminder: when estimating storage requirements for images, do not rely on an empty canvas for your calculations, because the size of a JPG file depends on both its resolution and the complexity of the image content.

---