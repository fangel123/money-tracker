"use client";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { locales, defaultLocale } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

interface I18nProviderProps {
  children: React.ReactNode;
  locale: Locale;
  messages: Record<string, string>;
}

export function I18nProvider({ children, locale, messages }: I18nProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export async function getI18nMessages(locale: Locale) {
  try {
    const messages = await getMessages({ locale });
    return messages;
  } catch {
    const fallbackMessages = await getMessages({ locale: defaultLocale });
    return fallbackMessages;
  }
}