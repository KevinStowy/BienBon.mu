import fr from './fr.json';
import en from './en.json';
import mfe from './mfe.json';

const translations: Record<string, Record<string, unknown>> = { fr, en, mfe };

export type Locale = 'fr' | 'en' | 'mfe';

export function t(locale: Locale, key: string): string {
  const keys = key.split('.');
  let value: unknown = translations[locale];
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return typeof value === 'string' ? value : key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const segment = url.pathname.split('/')[1];
  if (segment === 'en') return 'en';
  if (segment === 'kr') return 'mfe';
  return 'fr';
}

export function getLocalizedPath(locale: Locale, path: string): string {
  if (locale === 'fr') return path;
  if (locale === 'en') return `/en${path}`;
  return `/kr${path}`;
}

export function getAlternateUrls(canonicalPath: string): Record<string, string> {
  return {
    fr: `https://bienbon.mu${canonicalPath}`,
    en: `https://bienbon.mu/en${canonicalPath}`,
    kr: `https://bienbon.mu/kr${canonicalPath}`,
  };
}
