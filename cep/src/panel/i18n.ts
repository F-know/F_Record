import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'Dashboard': 'Dashboard',
      'Settings': 'Settings',
      'Process Image Folder': 'Process Image Folder',
      'Resolution': 'Resolution',
      'Quality': 'Quality',
      'Idle Timeout': 'Idle Timeout',
      'Language': 'Language',
      'select folder': 'select folder',
      'min': 'min',
      'h': 'h',
      'm': 'm',
      's': 's',
      'Off': 'Off',
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'Enabled': 'Enabled',
      'Disabled': 'Disabled',
      'Document': 'Document',
      'Image Count': 'Image Count',
      'Time Spent': 'Time Spent',
      'Open Process Image Folder': 'Open Process Image Folder',
      'Export': 'Export',
      'Select Process Image Folder': 'Select Process Image Folder',
      'The higher the Quality you select, the lower the compression rate applied to the image.': 'The higher the Quality you select, the lower the compression rate applied to the image.',
      'When the time elapsed since the last painting exceeds the preset duration, the timer will automatically stop.': 'When the time elapsed since the last painting exceeds the preset duration, the timer will automatically stop.',
      'Aspect Ratio': 'Aspect Ratio',
      'Duration': 'Duration',
      '(original)': '(original)',
      'match canvas': 'match canvas',
      'Confirm': 'Confirm',
      'Start to export': 'Start to export',
      'Export success': 'Export success',
      'Export failed': 'Export failed',
      'generating video...': 'generating video...',
      'loading image...': 'loading image...',
      'saving video...': 'saving video...',
      'Details': 'Details',
      'Open': 'Open',
      'Error': 'Error',
    }
  },
  cn: {
    translation: {
      'Dashboard': '面板',
      'Settings': '设置',
      'Process Image Folder': '过程图片文件夹',
      'Resolution': '分辨率',
      'Quality': '质量',
      'Idle Timeout': '离开时间',
      'Language': '语言',
      'select folder': '选择文件夹',
      'min': '分钟',
      'h': '时',
      'm': '分',
      's': '秒',
      'Off': '无',
      'low': '低',
      'medium': '中',
      'high': '高',
      'Enabled': '开启',
      'Disabled': '关闭',
      'Document': '文档',
      'Image Count': '图片数量',
      'Time Spent': '用时',
      'Open Process Image Folder': '打开过程图片文件夹',
      'Export': '导出',
      'Select Process Image Folder': '选择过程图片文件夹',
      'The higher the Quality you select, the lower the compression rate applied to the image.': '选择的质量越高，图片的压缩率越低。',
      'When the time elapsed since the last painting exceeds the preset duration, the timer will automatically stop.': '当距离上一次绘画的时间超过了这个时间，会自动停止计时',
      'Aspect Ratio': '宽高比',
      'Duration': '时长',
      '(original)': '（原始）',
      'match canvas': '画布比例',
      'Confirm': '确认',
      'Start to export': '开始导出',
      'Export success': '导出成功',
      'Export failed': '导出失败',
      'generating video...': '生成视频中...',
      'loading image...': '加载图片中...',
      'saving video...': '保存视频中...',
      'Details': '详情',
      'Open': '打开',
      'Error': '错误',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'cn', // 默认语言
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;