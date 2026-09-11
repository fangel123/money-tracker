import { getRequestConfig } from "next-intl/server";
import { locales } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is valid
  if (!locales.includes(locale as any)) {
    locale = "id";
  }

  return {
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Jakarta",
    now: new Date(),
  };
});