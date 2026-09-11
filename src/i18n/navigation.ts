import { createSharedPathnamesNavigation } from "next-intl/navigation";
import { locales, defaultLocale } from "./routing";

export const navigation = createSharedPathnamesNavigation({
  locales,
});

export const { Link, useRouter, usePathname, redirect, permanentRedirect } = navigation;