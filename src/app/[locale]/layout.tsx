import { I18nProvider } from "@/components/providers/I18nProvider";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <I18nProvider locale={locale as Locale} messages={messages as any}>
      {children}
    </I18nProvider>
  );
}
