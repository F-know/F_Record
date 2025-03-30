const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

/**
 * 将Photoshop像素数据保存为图像文件
 * @param {Object} pixmap - Photoshop生成的pixmap数据对象
 * @param {string} filePath - 要保存的文件路径
 * @param {Object} saveSettings - 保存设置
 * @returns {Promise<boolean>} - 保存成功返回true
 */
async function savePixmap(pixmap, filePath, saveSettings) {
    try {
        // 参数验证
        if (!pixmap || !filePath || !saveSettings) {
            throw new Error('缺少必要参数');
        }
        
        if (!pixmap.pixels || !Buffer.isBuffer(pixmap.pixels)) {
            throw new Error('无效的像素数据');
        }
        
        // 确保saveSettings包含所需属性
        saveSettings = {
            format: 'jpg',
            quality: 70,
            padding: { left: 0, top: 0, right: 0, bottom: 0 },
            extract: { x: 0, y: 0, width: pixmap.width || 0, height: pixmap.height || 0 },
            backgroundColor: { r: 255, g: 255, b: 255 }, // 默认白色背景
            ...saveSettings
        };
        
        // 确保目标目录存在
        const targetDir = path.dirname(filePath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 从pixmap参数中提取图像数据
        const { width, height, pixels, bytesPerPixel, rowBytes, channelCount } = pixmap;
        
        // 从saveSettings中获取参数
        const { format, quality, extract, padding, backgroundColor } = saveSettings;
        
        // 创建目标图像宽高
        const targetWidth = extract.width + padding.left + padding.right;
        const targetHeight = extract.height + padding.top + padding.bottom;
        
        if (targetWidth <= 0 || targetHeight <= 0) {
            throw new Error('目标图像尺寸无效');
        }
        
        // 创建一个新的Jimp图像
        const image = new Jimp(targetWidth, targetHeight);
        
        // 创建一个临时buffer来存储图像数据
        const buffer = Buffer.alloc(targetWidth * targetHeight * 4);
        
        // 根据格式决定填充颜色
        const formatType = (typeof format === 'string') ? format.toLowerCase() : 'jpg';
        
        if (formatType === 'png') {
            // PNG格式使用透明填充
            buffer.fill(0);
        } else {
            // JPG格式使用白色填充（或指定的背景色）
            const bg = backgroundColor || { r: 255, g: 255, b: 255 };
            
            // 填充整个buffer为白色（RGBA: 255, 255, 255, 255）
            for (let i = 0; i < buffer.length; i += 4) {
                buffer[i] = bg.r;     // R
                buffer[i + 1] = bg.g; // G
                buffer[i + 2] = bg.b; // B
                buffer[i + 3] = 255;  // A (完全不透明)
            }
        }
        
        // 批量处理图像数据，调整像素顺序
        for (let y = 0; y < extract.height; y++) {
            const targetY = y + padding.top;
            if (targetY < 0 || targetY >= targetHeight) continue;
            
            const srcY = extract.y + y;
            if (srcY < 0 || srcY >= height) continue;
            
            // 计算每行的起始偏移量
            const srcRowOffset = srcY * (rowBytes || (width * bytesPerPixel));
            const targetRowStart = (targetY * targetWidth + padding.left) * 4;
            
            // 计算需要处理的每行像素数
            const copyWidth = Math.min(extract.width, width - extract.x);
            if (copyWidth <= 0) continue;
            
            // 手动将像素从pixmap复制到buffer，调整通道顺序
            // Photoshop的pixmap是ARGB顺序，而Jimp需要RGBA顺序
            for (let x = 0; x < copyWidth; x++) {
                const srcOffset = srcRowOffset + (extract.x + x) * bytesPerPixel;
                const targetOffset = targetRowStart + x * 4;
                
                // 获取Alpha通道值
                const alpha = pixels[srcOffset];
                
                // 如果是完全透明的像素且输出格式是JPG，保留背景色
                if (formatType !== 'png' && alpha === 0) {
                    continue; // 跳过处理这个像素，保留背景色
                }
                
                // 正常处理有透明度的像素
                buffer[targetOffset] = pixels[srcOffset + 1];     // R
                buffer[targetOffset + 1] = pixels[srcOffset + 2]; // G
                buffer[targetOffset + 2] = pixels[srcOffset + 3]; // B
                buffer[targetOffset + 3] = alpha;                 // A
                
                // 如果是JPG格式，对半透明像素进行背景混合
                if (formatType !== 'png' && alpha < 255 && alpha > 0) {
                    const alphaFactor = alpha / 255;
                    const bg = backgroundColor || { r: 255, g: 255, b: 255 };
                    
                    // 与背景色混合
                    buffer[targetOffset] = Math.round(buffer[targetOffset] * alphaFactor + bg.r * (1 - alphaFactor));
                    buffer[targetOffset + 1] = Math.round(buffer[targetOffset + 1] * alphaFactor + bg.g * (1 - alphaFactor));
                    buffer[targetOffset + 2] = Math.round(buffer[targetOffset + 2] * alphaFactor + bg.b * (1 - alphaFactor));
                    buffer[targetOffset + 3] = 255; // JPG不支持透明度，设为完全不透明
                }
            }
        }
        
        // 将buffer数据加载到Jimp图像
        image.bitmap.data = buffer;
        image.bitmap.width = targetWidth;
        image.bitmap.height = targetHeight;
        
        // 设置图像质量 (Jimp质量范围是0-100，Photoshop也是0-100)
        const jpgQuality = Math.min(Math.max(0, quality), 100);
        
        // 保存图像
        if (formatType === 'png') {
            await image.writeAsync(filePath);
        } else {
            // 默认为JPEG
            await image.quality(jpgQuality).writeAsync(filePath);
        }
        
        return true;
    } catch (error) {
        console.error('保存图像失败:', error);
        throw error;
    }
}

module.exports = savePixmap;