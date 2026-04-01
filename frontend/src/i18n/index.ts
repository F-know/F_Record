import { createI18n } from 'vue-i18n'

import en from './messages/en'
import zh from './messages/zh'
import ja from './messages/ja'

export type UiLocale = 'en' | 'zh' | 'ja'
export type ConfigLanguage = 'en' | 'cn' | 'ja'

export function uiLocaleFromConfigLanguage(lang: string | undefined | null): UiLocale {
  if (lang === 'en') return 'en'
  if (lang === 'cn') return 'zh'
  if (lang === 'ja') return 'ja'
  return 'en'
}

export function configLanguageFromUiLocale(locale: UiLocale): ConfigLanguage {
  if (locale === 'zh') return 'cn'
  return locale
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    zh,
    ja,
  },
})

