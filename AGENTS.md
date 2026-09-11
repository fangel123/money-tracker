# Agent Instructions — Money Tracker

## Purpose
This file guides AI agents (Claude Code, Codex, OpenCode, etc.) working on the Money Tracker codebase. Follow these rules strictly.

---

## 1. Project Context

| Property | Value |
|----------|-------|
| **Project** | Money Tracker — Personal finance web app |
| **Stack** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, next-intl, Zustand, TanStack Query, Recharts |
| **Scope** | Core MVP: transactions, categories, accounts, budgets, dashboard, settings, auth (email/password) |
| **Locales** | `id` (default), `en`, `zh`, `ja`, `ko` |
| **Deploy** | Vercel + Supabase |

---

## 2. Code Standards

### TypeScript
- **Strict mode**: `true` — no `any`, no implicit any
- **Path aliases**: `@/*` → `src/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`, `@/types/*`
- **Shared types**: `src/types/` — domain types (Transaction, Category, Account, Budget, User)
- **Zod schemas**: `src/lib/validators/` — single source of truth for validation (client + server)

### React / Next.js
- **Server Components by default** — only `'use client'` when needed (interactivity, hooks, browser APIs)
- **App Router patterns**: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- **Server Actions** for mutations (forms, CRUD) — prefer over API routes
- **Route Groups**: `(auth)`, `(app)`, `(marketing)` for layout separation
- **Middleware**: `middleware.ts` for auth guard, locale redirect, theme cookie

### Styling
- **Tailwind only** — no custom CSS files (except globals.css for `@tailwind` + CSS variables)
- **shadcn/ui** components — copy to `src/components/ui/`, customize there
- **Design tokens** from `DESIGN.md` — use Tailwind config, not hardcoded values
- **Dark mode**: `class` strategy — toggle `<html class="dark">`

### State Management
| Scope | Tool | Usage |
|-------|------|-------|
| **Server state** | TanStack Query | All Supabase queries, caching, invalidation |
| **Client UI state** | Zustand | Theme, locale, sidebar open, modals, toasts |
| **Form state** | React Hook Form + Zod | All forms |
| **URL state** | Search params (nuqs) | Filters, pagination, sort |

### Database (Supabase)
- **Row Level Security (RLS)** — mandatory on all tables
- **Migrations**: `supabase/migrations/` — versioned, run via `supabase db push`
- **Types**: `supabase/types.ts` — generated via `supabase gen types typescript`
- **Client**: `src/lib/supabase/` — server client (Server Components), browser client (Client Components)

---

## 3. File Structure (Enforced)

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx          # Sidebar + header
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── budgets/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx              # Locale wrapper, providers
│   │   ├── page.tsx                # Redirect to /[locale]/dashboard
│   │   └── not-found.tsx
│   ├── api/                        # Only for webhooks, cron, non-Server-Action needs
│   ├── globals.css
│   └── middleware.ts
├── components/
│   ├── ui/                         # shadcn/ui components (button, input, card, etc.)
│   ├── dashboard/                  # Dashboard-specific (SummaryCards, Charts, QuickActions)
│   ├── transactions/               # TransactionList, TransactionForm, TransactionCard, Filters
│   ├── categories/                 # CategoryForm, CategorySelector, IconPicker, ColorPicker
│   ├── budgets/                    # BudgetCard, BudgetForm, ProgressBar
│   ├── accounts/                   # AccountForm, AccountSelector, BalanceDisplay
│   ├── settings/                   # ProfileForm, PreferencesForm, DangerZone
│   ├── layout/                     # Sidebar, BottomNav, Header, LanguageSwitcher, ThemeToggle
│   ├── providers/                  # QueryProvider, ThemeProvider, LocaleProvider, Toaster
│   └── common/                     # EmptyState, ErrorDisplay, ConfirmDialog, LoadingSkeleton
├── hooks/
│   ├── use-transactions.ts
│   ├── use-categories.ts
│   ├── use-accounts.ts
│   ├── use-budgets.ts
│   └── use-auth.ts
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # createServerClient
│   │   ├── browser.ts              # createBrowserClient
│   │   └── middleware.ts           # updateSession
│   ├── validators/                 # Zod schemas (transaction.ts, category.ts, etc.)
│   ├── utils.ts                    # cn(), formatCurrency(), formatDate(), etc.
│   └── constants.ts                # App constants (currencies, categories defaults, etc.)
├── store/
│   ├── theme-store.ts
│   ├── locale-store.ts
│   ├── ui-store.ts                 # modals, sidebars, toasts
│   └── index.ts
├── types/
│   ├── database.ts                 # Supabase generated types
│   ├── domain.ts                   # App domain types (extends DB types)
│   └── i18n.ts                     # next-intl types
├── i18n/
│   ├── request.ts                  # getRequestConfig
│   ├── routing.ts                  # defineRouting
│   └── navigation.ts               # useRouter, usePathname, Link (typed)
└── messages/
    ├── id.json
    ├── en.json
    ├── zh.json
    ├── ja.json
    └── ko.json
```

---

## 4. Workflow Rules

### Before Writing Code
1. **Read existing files** — understand patterns, imports, conventions
2. **Check `DESIGN.md`** — colors, spacing, components, i18n keys
3. **Use existing utilities** — `cn()`, `formatCurrency()`, `formatDate()`, validators
4. **Follow component hierarchy** — compose from `ui/` primitives

### When Creating Components
- **Props interface** → `ComponentNameProps`
- **Default exports** for pages, **named exports** for components
- **Client Components**: `'use client'` at top, minimal surface area
- **Server Components**: async, fetch data directly, no browser APIs

### When Writing Server Actions
```typescript
// src/app/[locale]/(app)/transactions/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/validators/transaction'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTransaction(formData: FormData) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const validated = transactionSchema.parse(Object.fromEntries(formData))
  const { error } = await supabase.from('transactions').insert({
    ...validated,
    user_id: user.id,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/[locale]/transactions')
  revalidatePath('/[locale]/dashboard')
}
```

### Database Changes
1. Create migration: `supabase migration create <name>`
2. Write SQL with RLS policies
3. Run `supabase db push`
4. Regenerate types: `supabase gen types typescript --local > src/types/database.ts`
5. Update domain types if needed

### i18n Additions
1. Add keys to `src/messages/id.json` (source locale)
2. Run `pnpm i18n:sync` (script to copy structure to other locales)
3. Translate other locales (or mark with `TODO:` prefix)
4. Use `t('namespace.key')` in components

---

## 5. Common Patterns

### Data Fetching (Server Component)
```typescript
// src/app/[locale]/(app)/dashboard/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { getTransactions } from '@/lib/queries/transactions'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { Charts } from '@/components/dashboard/Charts'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/[locale]/auth/login')

  const transactions = await getTransactions(supabase, user.id)
  return (
    <div className="space-y-6 p-4 md:p-6">
      <SummaryCards transactions={transactions} />
      <Charts transactions={transactions} />
    </div>
  )
}
```

### Client Component with Query
```typescript
// src/components/transactions/TransactionList.tsx
'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import { transactionKeys } from '@/lib/query-keys'
import { TransactionCard } from './TransactionCard'
import { EmptyState } from '@/components/common/EmptyState'

export function TransactionList({ accountId }: { accountId?: string }) {
  const { data: transactions } = useSuspenseQuery({
    queryKey: transactionKeys.list({ accountId }),
    queryFn: () => fetchTransactions(accountId),
  })

  if (transactions.length === 0) {
    return <EmptyState icon="receipt" titleKey="transactions.empty.title" actionKey="transactions.empty.action" />
  }

  return (
    <div className="space-y-2">
      {transactions.map(t => <TransactionCard key={t.id} transaction={t} />)}
    </div>
  )
}
```

### Form with Server Action
```typescript
// src/components/transactions/TransactionForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transactionSchema, TransactionFormData } from '@/lib/validators/transaction'
import { createTransaction } from '@/app/[locale]/(app)/transactions/actions'
import { useActionState } from 'react'
import { Button, Input, Select, Textarea } from '@/components/ui'

export function TransactionForm() {
  const [state, formAction] = useActionState(createTransaction, { error: null })
  const form = useForm<TransactionFormData>({ resolver: zodResolver(transactionSchema) })

  return (
    <form action={formAction} className="space-y-4">
      <FormField name="amount" render={({ field }) => <CurrencyInput {...field} />} />
      <FormField name="category_id" render={({ field }) => <CategorySelect {...field} />} />
      <FormField name="account_id" render={({ field }) => <AccountSelect {...field} />} />
      <FormField name="date" render={({ field }) => <DateInput {...field} />} />
      <FormField name="note" render={({ field }) => <Textarea {...field} />} />
      <Button type="submit" disabled={state.isPending}>
        {state.isPending ? 'Menyimpan...' : 'Simpan'}
      </Button>
      {state.error && <ErrorDisplay message={state.error} />}
    </form>
  )
}
```

---

## 6. Testing Requirements

| Type | Tool | Coverage Target |
|------|------|-----------------|
| **Unit** | Vitest + React Testing Library | Validators, utils, hooks, store |
| **Integration** | Vitest + MSW | Server Actions, API routes |
| **E2E** | Playwright | Critical flows: auth, CRUD transactions, budget alerts |
| **Visual** | Playwright + pixelmatch | Key pages (dashboard, transaction form) |

**Run**: `pnpm test` (unit), `pnpm test:e2e` (E2E)

---

## 7. Git & Commits

### Branch Strategy
- `main` — production ready
- `feature/<slug>` — feature branches
- `fix/<slug>` — bug fixes
- `chore/<slug>` — maintenance

### Commit Format (Conventional Commits)
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type | Example |
|------|---------|
| `feat` | `feat(transactions): add recurring toggle` |
| `fix` | `fix(budgets): correct progress calculation` |
| `refactor` | `refactor(ui): migrate to shadcn v2` |
| `chore` | `chore(deps): update next.js to 14.2` |
| `docs` | `docs(design): update color tokens` |
| `test` | `test(hooks): add useTransactions tests` |

---

## 8. Performance Budgets

| Metric | Target |
|--------|--------|
| **LCP** | < 2.5s |
| **FID** | < 100ms |
| **CLS** | < 0.1 |
| **Bundle (JS)** | < 150KB gzipped (initial) |
| **Lighthouse** | ≥ 90 all categories |

---

## 9. Security Checklist

- [ ] All Server Actions validate auth + input (Zod)
- [ ] RLS enabled on all Supabase tables
- [ ] No secrets in client code (use `NEXT_PUBLIC_` prefix only for public keys)
- [ ] CSP headers configured in `next.config.js`
- [ ] Rate limiting on auth endpoints (Supabase built-in)
- [ ] HTTPS only (Vercel default)

---

## 10. Agent-Specific Notes

### For Claude Code / Codex / OpenCode
- **Read `DESIGN.md` first** — it's the visual spec
- **Follow file structure exactly** — no ad-hoc folders
- **Prefer Server Components** — minimize `'use client'`
- **Use existing patterns** — grep for similar implementations
- **Run typecheck** (`pnpm typecheck`) after changes
- **Run lint** (`pnpm lint`) before commit

### For Code Review (Automated)
- TypeScript strict: no errors
- ESLint: no warnings
- Tests pass: `pnpm test`
- Build succeeds: `pnpm build`
- Bundle size check: `pnpm build && pnpm analyze`

---

## 11. Useful Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm start                  # Start production server

# Database
supabase start              # Local Supabase
supabase db push            # Push migrations
supabase gen types typescript --local > src/types/database.ts

# i18n
pnpm i18n:sync              # Sync message keys across locales

# Quality
pnpm typecheck              # tsc --noEmit
pnpm lint                   # next lint
pnpm test                   # Unit tests
pnpm test:e2e               # Playwright E2E
pnpm format                 # Prettier

# Analysis
pnpm analyze                # Bundle analyzer
pnpm lighthouse             # Lighthouse CI
```

---

**Version**: 1.0  
**Last Updated**: 2026-09-10  
**Status**: Active — enforce on all contributions