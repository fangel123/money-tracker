# Design Specification — Money Tracker (Core MVP)

## 1. Brand & Visual Identity

| Property | Value |
|----------|-------|
| **App Name** | Money Tracker |
| **Tagline** | "Catat. Kelola. Tumbuh." |
| **Primary Color** | `#059669` (Emerald 600) — trust, growth |
| **Secondary** | `#0891b2` (Cyan 600) — clarity, flow |
| **Accent** | `#f59e0b` (Amber 500) — warnings, highlights |
| **Danger** | `#dc2626` (Red 600) — overspend, delete |
| **Background (Light)** | `#f8fafc` (Slate 50) |
| **Surface (Light)** | `#ffffff` |
| **Background (Dark)** | `#0f172a` (Slate 950) |
| **Surface (Dark)** | `#1e293b` (Slate 800) |
| **Typography** | **Inter** (UI), **JetBrains Mono** (numbers) |
| **Spacing Scale** | 4px base (Tailwind default) |
| **Border Radius** | `rounded-xl` (12px) cards, `rounded-lg` (8px) inputs, `rounded-full` pills |
| **Shadow** | `shadow-sm` cards, `shadow-lg` modals/dropdowns |

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
| **Navigation** | Bottom tab bar (5 items) | Left sidebar (collapsible) |
| **Header** | Sticky top: title + actions | Sticky top: search + user menu |
| **Content** | Single column, full width | Max-w-4xl centered, sidebar offset |
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

## 10. Design Tokens (Tailwind Config Extension)

```js
// tailwind.config.ts additions
theme: {
  extend: {
    colors: {
      primary: { 50: '#ecfdf5', ..., 600: '#059669', ..., 900: '#064e3b' },
      secondary: { 50: '#f0fdfa', ..., 600: '#0d9488', ..., 900: '#134e4a' },
      accent: { 50: '#fffbeb', ..., 500: '#f59e0b', ..., 900: '#78350f' },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    boxShadow: {
      'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  },
}
```

---

**Status**: ✅ Approved for implementation  
**Version**: 1.0  
**Last Updated**: 2026-09-10