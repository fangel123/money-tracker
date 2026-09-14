import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is a Promise in next-intl 3.22+
  let locale = await requestLocale;

  // Validate that the incoming locale is valid, fallback to default
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Asia/Jakarta",
    now: new Date(),
  };
});