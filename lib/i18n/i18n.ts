import { useEffect, useSyncExternalStore } from 'react';
import { MESSAGES, type Messages } from '../config/messages';
import { MESSAGES_PL } from '../config/messages.pl';

const LOCALE_MESSAGES = { en: MESSAGES, pl: MESSAGES_PL } satisfies Record<string, Messages>;

export type Locale = keyof typeof LOCALE_MESSAGES;

const DEFAULT_LOCALE: Locale = 'en';

const isLocale = (value: string): value is Locale => Object.hasOwn(LOCALE_MESSAGES, value);

export const resolveLocale = (languages: readonly string[]): Locale =>
  languages.map((language) => language.split('-')[0]?.toLowerCase() ?? '').find(isLocale) ?? DEFAULT_LOCALE;

const subscribe = (onChange: () => void) => {
  globalThis.addEventListener('languagechange', onChange);
  return () => globalThis.removeEventListener('languagechange', onChange);
};

export const useLocale = (): Locale =>
  useSyncExternalStore(
    subscribe,
    () => resolveLocale(navigator.languages),
    () => DEFAULT_LOCALE,
  );

export const useMessages = (): Messages => LOCALE_MESSAGES[useLocale()];

export const usePlural = () => {
  const locale = useLocale();
  return (count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) =>
    `${count} ${forms[new Intl.PluralRules(locale).select(count)] ?? forms.other}`;
};

export const useDocumentLanguage = () => {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
};
