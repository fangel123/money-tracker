export const locales = ["id", "en"] as const;
export const defaultLocale = "id" as const;
export type Locale = (typeof locales)[number];

export const localePrefix = "always"; // Default

export const pathnames = {
  "/": "/",
  "/dashboard": "/dashboard",
  "/transactions": "/transactions",
  "/transactions/new": "/transactions/new",
  "/categories": "/categories",
  "/budgets": "/budgets",
  "/accounts": "/accounts",
  "/settings": "/settings",
  "/login": "/login",
  "/register": "/register",
  "/forgot-password": "/forgot-password",
} as const;