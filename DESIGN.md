# Design Specification — Koin (tema kartun)

## 1. Brand & Visual Identity

| Property | Value |
|----------|-------|
| **App Name** | Koin |
| **Tagline** | "Catat. Kelola. Tumbuh." |
| **Mascot** | Koin — koin kuning bermuka senyum (`components/common/Mascot.tsx`), juga nama AI Advisor |
| **Gaya** | Kartun: garis tinta tebal, bayangan keras tanpa blur, warna rata (tanpa gradien) |
| **Primary** | `#C8F031` (lime) — tombol utama, item nav aktif, kartu hero Dashboard |
| **Tinta / garis** | `#1E1B18` (terang), `#050407` (gelap) — token `line`, `ink` |
| **Latar** | `#FFF4DE` krem (terang) · `#15121D` malam (gelap) |
| **Permukaan** | `#FFFFFF` (terang) · `#2B2638` (gelap) |
| **Palet kartun** | pink `#FF9EBB` (keluar), mint `#9BE7C4` (masuk), langit `#8FD3FF` (transfer), kuning `#FFD447`, lilac `#C9B6FF`, oranye `#FFB86B`, merah `#FF5C7A` (bahaya) |
| **Angka uang** | `text-income` / `text-expense` (berubah otomatis di mode gelap) |
| **Typography** | **Fredoka** (judul & angka besar, `font-display`), **Nunito** 600–900 (teks, `font-sans`) |
| **Border** | `border-3 border-line` untuk kartu, tombol, input; `border-2.5` untuk chip & stiker |
| **Shadow** | `shadow-cartoon-sm` (3px), `shadow-cartoon` (4px), `shadow-cartoon-lg` (6px) — offset, tanpa blur |
| **Border Radius** | `rounded-cartoon` (26px) kartu, `rounded-2xl` tombol/input, `rounded-full` chip |
| **Tekan** | Tombol bergeser 3px dan bayangan hilang (`active:translate-*`) |
| **Teks di atas warna cerah** | Selalu `text-ink` (gelap), di mode terang maupun gelap |

### Komponen tema
- `Sticker` / `CategorySticker` — ikon dalam kotak bergaris tinta, warna kategori dilembutkan jadi pastel, boleh miring ±3–6°
- `HeroCard` + `CartoonBar` — kartu ringkasan berwarna & progress bar bergaris tebal
- `PageHeader` — judul halaman (di desktop judul pindah ke top bar)
- `Mascot` — ilustrasi dekoratif (`aria-hidden`), dipakai di empty state, AI Advisor, halaman masuk

## 2. Layout & Responsiveness

```
Breakpoints (Tailwind default):
- sm:  640px   → Mobile landscape / small tablet
- md:  768px   → Tablet portrait
- lg:  1024px  → Tablet landscape / small desktop
- xl:  1280px  → Desktop
- 2xl: 1536px  → Large desktop
```

### Layout Regions

| Region | Mobile (< md) | Desktop (≥ md) |
|--------|---------------|----------------|
| **Navigation** | Bottom bar mengambang (Dashboard, Akun, + Catat, Transaksi, Lainnya) | Sidebar kartu mengambang + tombol "Catat Transaksi" |
| **Header** | Menu + logo Koin + tema + akun | Tanggal + judul halaman + tema + bahasa + akun |
| **Content** | Single column, full width | Grid lebar; Dashboard muat 1 layar 1440×900 tanpa scroll |
| **FAB** | Bottom-right: quick add | Top-right in header + FAB |

### Grid System
- **Mobile**: 1-col (padding 16px)
- **Tablet**: 2-col dashboard cards (gap 16px)
- **Desktop**: 3-col dashboard, 2-col forms (label + input)

## 3. Core Pages & Components

### 3.1 Pages (App Router Structure)

```
/ (root) → redirect to /dashboard
/dashboard          → Ringkasan bulanan, grafik, quick actions
/transactions       → List + filter + infinite scroll
/transactions/new   → Form transaksi (modal di mobile, page di desktop)
/categories         → CRUD kategori (icon + color picker)
/budgets            → Budget per kategori + progress
/accounts           → CRUD akun + saldo
/settings           → Profile, currency, language, theme, export
/auth/login         → Email/password + register link
/auth/register      → Register + email verification
/auth/forgot-password → Reset password flow
```

### 3.2 Key Components

| Component | Variants | Notes |
|-----------|----------|-------|
| **TransactionCard** | income/expense, swipe actions (edit/delete) | Tap → detail modal |
| **CategoryChip** | icon + label, color bg | Used in forms, filters, chips |
| **AccountSelector** | dropdown + balance preview | Header + transaction form |
| **CurrencyInput** | auto-format (IDR default), keyboard optimized | `Intl.NumberFormat` |
| **DatePicker** | native `<input type="date">` + preset chips (Today, This Week, This Month) | |
| **ChartCard** | wrapper: title, period selector, responsive chart | Recharts + Tremor |
| **BudgetProgressBar** | gradient fill, threshold colors (green→amber→red) | Click → detail |
| **BottomNav** | 5 items: Dashboard, Transaksi, Budget, Akun, Settings | Mobile only |
| **Sidebar** | Collapsible, icon-only when collapsed | Desktop only |
| **LanguageSwitcher** | Flag + name, dropdown | Header (desktop), Settings (mobile) |
| **ThemeToggle** | Light/Dark/System | Persist in localStorage + cookie |

## 4. Forms & Validation

| Field | Validation | UX |
|-------|------------|----|
| **Amount** | Required, > 0, max 2 decimals | Live format, clear button |
| **Category** | Required (select existing or create inline) | Searchable combobox |
| **Account** | Required | Default = last used |
| **Date** | Required, ≤ today (expense), ≤ future (income) | Preset chips |
| **Note** | Optional, max 500 chars | Auto-expand textarea |
| **Recurring** | Toggle → shows frequency select | Monthly, Weekly, Custom |

**Validation Library**: Zod + React Hook Form (server + client shared schemas)

## 5. Internationalization (i18n)

### Supported Locales
| Code | Name | Flag | RTL? |
|------|------|------|------|
| `id` | Indonesia | 🇮🇩 | No |
| `en` | English | 🇺🇸 | No |
| `zh` | 中文 (简体) | 🇨🇳 | No |
| `ja` | 日本語 | 🇯🇵 | No |
| `ko` | 한국어 | 🇰🇷 | No |

### Implementation
- **Library**: `next-intl` (App Router compatible)
- **Routing**: `/[locale]/...` — locale prefix mandatory
- **Default**: `id` (Indonesia)
- **Detection**: `Accept-Language` header → cookie → default
- **Translation Files**: `messages/{locale}.json` (flat keys)
- **Currency/Number/Date**: `Intl` APIs per locale (not hardcoded)

### Key Translation Namespaces
```
common          → buttons, labels, empty states
auth            → login, register, password reset
dashboard       → summary cards, chart labels
transactions    → list, form, filters, categories
budgets         → budget cards, progress, alerts
accounts        → account types, balances
settings        → profile, preferences, danger zone
errors          → validation, toast, server errors
```

## 6. Accessibility (WCAG 2.1 AA)

- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- Focus visible: `focus-visible:ring-2 focus-visible:ring-primary`
- Color contrast: ≥ 4.5:1 text, ≥ 3:1 UI elements
- ARIA labels on icon-only buttons
- Keyboard navigation: Tab order logical, Escape closes modals
- Screen reader: Live regions for toasts, budget alerts
- Reduced motion: `prefers-reduced-motion` disables animations

## 7. Animation & Micro-interactions

| Trigger | Animation | Duration |
|---------|-----------|----------|
| Page transition | Fade + slide up | 200ms |
| Card hover | Scale 1.02 + shadow | 150ms |
| FAB press | Scale 0.95 | 100ms |
| Budget progress | Width animate | 500ms ease-out |
| Toast slide-in | Slide up + fade | 300ms |
| Theme toggle | Cross-fade | 200ms |

**Library**: `framer-motion` (layout animations), CSS transitions for simple cases

## 8. Empty States & Error Handling

| Scenario | Illustration | Action |
|----------|--------------|--------|
| No transactions | 📭 "Belum ada transaksi" | "Tambah Transaksi" button |
| No budgets | 🎯 "Belum ada budget" | "Buat Budget" button |
| Offline | 📡 "Mode offline" | Sync indicator |
| Load error | ⚠️ "Gagal memuat" | "Coba Lagi" button |
| Auth error | 🔒 specific message | Link to help |

## 9. PWA Configuration

| Property | Value |
|----------|-------|
| **Manifest** | `name`, `short_name`, `icons` (192, 512), `theme_color`, `background_color`, `display: standalone` |
| **Service Worker** | Workbox: `StaleWhileRevalidate` for assets, `NetworkFirst` for API |
| **Offline Page** | Custom `/offline` with cached dashboard snapshot |
| **Install Prompt** | Custom banner after 3 visits + 2 min engagement |

## 10. Design Tokens

Token warna ada di `src/app/globals.css` sebagai kanal RGB (`--primary: 200 240 49;`) untuk `:root` dan `.dark`,
lalu dipetakan di `tailwind.config.ts` sebagai `rgb(var(--x) / <alpha-value>)` supaya modifier opasitas
(`bg-destructive/10`) berfungsi. Token tambahan: `line`, `divider`, `income`, `expense`, `ink`, `cream`,
`cartoon.{lime,pink,mint,sky,yellow,lilac,orange,red,sand}`, `shadow-cartoon*`, `rounded-cartoon`, `border-3`,
`border-2.5`, `font-display`.

---

**Status**: ✅ Approved for implementation  
**Version**: 2.0 (tema kartun Koin)  
**Last Updated**: 2026-10-01