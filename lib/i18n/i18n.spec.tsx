import { act, render, renderHook, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../config/messages';
import { MESSAGES_PL } from '../config/messages.pl';
import { resolveLocale, useDocumentLanguage, useMessages, usePlural } from './i18n';

const setLanguages = (languages: string[]) => vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);

const keysOf = (value: object, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' ? keysOf(child as object, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

const EditorLink = () => <span>{useMessages().page.editor}</span>;

describe('i18n', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves the first supported browser language and falls back to english', () => {
    expect(resolveLocale(['pl-PL', 'en-US'])).toBe('pl');
    expect(resolveLocale(['PL'])).toBe('pl');
    expect(resolveLocale(['de-DE', 'pl'])).toBe('pl');
    expect(resolveLocale(['en-GB', 'pl'])).toBe('en');
    expect(resolveLocale(['de-DE', 'fr'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });

  it('has polish translation for every english message', () => {
    expect(keysOf(MESSAGES_PL)).toEqual(keysOf(MESSAGES));
  });

  it('shows polish messages in polish browser and english otherwise', () => {
    setLanguages(['pl-PL']);
    const { unmount } = render(<EditorLink />);
    expect(screen.getByText(MESSAGES_PL.page.editor)).toBeTruthy();
    unmount();

    setLanguages(['de-DE']);
    render(<EditorLink />);
    expect(screen.getByText(MESSAGES.page.editor)).toBeTruthy();
  });

  it('renders english on the server so prerendered html hydrates without mismatch', () => {
    setLanguages(['pl-PL']);
    expect(renderToString(<EditorLink />)).toContain(MESSAGES.page.editor);
  });

  it('updates on browser language change', () => {
    const languages = setLanguages(['en-US']);
    render(<EditorLink />);

    languages.mockReturnValue(['pl-PL']);
    act(() => {
      globalThis.dispatchEvent(new Event('languagechange'));
    });

    expect(screen.getByText(MESSAGES_PL.page.editor)).toBeTruthy();
  });

  it('sets document language', () => {
    setLanguages(['pl-PL']);
    renderHook(() => useDocumentLanguage());
    expect(document.documentElement.lang).toBe('pl');
  });

  it('formats counts with plural forms of the locale', () => {
    setLanguages(['pl-PL']);
    const { result } = renderHook(() => usePlural());
    const forms = MESSAGES_PL.device.leds;
    expect([1, 2, 5, 22, 25].map((count) => result.current(count, forms))).toEqual([
      '1 dioda',
      '2 diody',
      '5 diod',
      '22 diody',
      '25 diod',
    ]);
  });
});
