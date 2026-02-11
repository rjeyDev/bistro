export type Lang = 'tm' | 'ru' | 'en';

export const LANG_VALUES: Lang[] = ['tm', 'ru', 'en'];
export const DEFAULT_LANG: Lang = 'en';

export function parseLang(value: string | undefined): Lang {
  if (value === 'tm' || value === 'ru' || value === 'en') {
    return value;
  }
  return DEFAULT_LANG;
}

export interface HasNameTmRuEn {
  nameTm: string | null;
  nameRu: string | null;
  nameEn: string | null;
}

export function getNameByLang(entity: HasNameTmRuEn, lang: Lang): string {
  const name = entity[`name${lang.charAt(0).toUpperCase()}${lang.slice(1)}` as keyof HasNameTmRuEn];
  if (name != null && name !== '') return name;
  return entity.nameEn ?? entity.nameRu ?? entity.nameTm ?? '';
}

/** Fallback name when lang is unknown (e.g. receipts, error messages). */
export function getAnyName(entity: HasNameTmRuEn): string {
  return entity.nameEn ?? entity.nameRu ?? entity.nameTm ?? '';
}
