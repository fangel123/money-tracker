# Architecture Document — Money Tracker (Core MVP)

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE NETWORK                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Next.js App    │  │  Middleware     │  │  Static Assets  │ │
│  │  (Server Comp)  │  │  (Auth, Locale, │  │  (Images, Fonts,│ │
│  │  Server Actions │  │   Theme, CSP)   │  │   Manifest)     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  PostgreSQL     │  │  Auth           │  │  Realtime       │ │
│  │  (Tables, RLS,  │  │  (Email/Pass,   │  │  (Live updates  │ │
│  │   Functions)    │  │   Sessions, MFA)│  │   for budgets)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Framework** | Next.js | 14.x (App Router) | SSR, RSC, Server Actions, SEO, i18n routing |
| **Language** | TypeScript | 5.x | Strict typing, developer experience |
| **Styling** | Tailwind CSS | 3.x | Utility-first, responsive, dark mode |
| **UI Library** | shadcn/ui | Latest | Accessible, customizable, copy-paste |
| **Database** | Supabase (PostgreSQL) | 15+ | Managed, Auth, RLS, Realtime, generous free tier |
| **ORM/Client** | Supabase JS Client | 2.x | Type-safe, RLS-aware, realtime |
| **State (Server)** | TanStack Query | 5.x | Caching, invalidation, optimistic updates |
| **State (Client)** | Zustand | 4.x | Lightweight, no boilerplate |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | Performant, schema validation |
| **i18n** | next-intl | 3.x | App Router native, type-safe |
| **Charts** | Recharts | 2.x | Composable, responsive, SSR-friendly |
| **Date** | date-fns | 3.x | Tree-shakable, locale-aware |
| **Validation** | Zod | 3.x | Schema-first, inferred types |
| **Icons** | Lucide React | Latest | Consistent, tree-shakable |
| **Deploy** | Vercel | - | Zero-config, edge, preview deployments |
| **Package Manager** | pnpm | 9.x | Fast, disk-efficient, strict |

## 3. Data Architecture

### 3.1 Database Schema (Supabase/PostgreSQL)

```sql
-- Users (extends auth.users via trigger)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'IDR',
  locale TEXT DEFAULT 'id',
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'credit_card', 'investment', 'other')),
  currency TEXT NOT NULL DEFAULT 'IDR',
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  icon TEXT, -- lucide icon name
  color TEXT, -- hex color
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT, -- lucide icon name
  color TEXT, -- hex color
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL,
  note TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_rule JSONB, -- {frequency, interval, end_date, ...}
  parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  alert_threshold NUMERIC(3,2) DEFAULT 0.8, -- 80%
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, period, start_date)
);

-- Indexes for query performance
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_account ON public.transactions(user_id, account_id);
CREATE INDEX idx_transactions_user_category ON public.transactions(user_id, category_id);
CREATE INDEX idx_budgets_user_period ON public.budgets(user_id, period, start_date);
CREATE INDEX idx_accounts_user_active ON public.accounts(user_id, is_active);
CREATE INDEX idx_categories_user_type ON public.categories(user_id, type, is_active);
```

### 3.2 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/update their own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Accounts: full CRUD for owner
CREATE POLICY "Users can manage own accounts" ON public.accounts
  FOR ALL USING (auth.uid() = user_id);

-- Categories: full CRUD for owner
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id);

-- Transactions: full CRUD for owner
CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id);

-- Budgets: full CRUD for owner
CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id);
```

### 3.3 Database Functions & Triggers

```sql
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, locale)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_user_meta_data->>'locale', 'id'));
  -- Insert default categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default, sort_order)
  VALUES
    (NEW.id, 'Gaji', 'income', 'briefcase', '#059669', TRUE, 1),
    (NEW.id, 'Freelance', 'income', 'laptop', '#0891b2', TRUE, 2),
    (NEW.id, 'Lainnya', 'income', 'plus-circle', '#64748b', TRUE, 3),
    (NEW.id, 'Makanan', 'expense', 'utensils-crossed', '#ef4444', TRUE, 1),
    (NEW.id, 'Transport', 'expense', 'car', '#f97316', TRUE, 2),
    (NEW.id, 'Belanja', 'expense', 'shopping-bag', '#eab308', TRUE, 3),
    (NEW.id, 'Hiburan', 'expense', 'gamepad-2', '#a855f7', TRUE, 4),
    (NEW.id, 'Kesehatan', 'expense', 'heart-pulse', '#ec4899', TRUE, 5),
    (NEW.id, 'Pendidikan', 'expense', 'graduation-cap', '#06b6d4', TRUE, 6),
    (NEW.id, 'Lainnya', 'expense', 'more-horizontal', '#64748b', TRUE, 7);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update account balance on transaction insert/update/delete
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  balance_change NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    balance_change = CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
    UPDATE public.accounts SET balance = balance + balance_change WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Revert old, apply new
    balance_change = CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
    balance_change = balance_change + CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END;
    UPDATE public.accounts SET balance = balance + balance_change WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    balance_change = CASE WHEN OLD.type = 'income' THEN -OLD.amount ELSE OLD.amount END;
    UPDATE public.accounts SET balance = balance + balance_change WHERE id = OLD.account_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER transaction_balance_update
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();
```

## 4. Application Architecture

### 4.1 Next.js App Router Structure

```
src/app/
├── [locale]/                    # Dynamic locale segment (required)
│   ├── layout.tsx               # Root layout: providers, fonts, globals
│   ├── page.tsx                 # Redirect to /dashboard
│   ├── not-found.tsx            # 404 page
│   ├── globals.css              # Tailwind + CSS variables
│   ├── middleware.ts            # Auth guard, locale, theme, CSP
│   │
│   ├── (auth)/                  # Route group: no sidebar/header
│   │   ├── layout.tsx           # Auth layout (centered card)
│   │   ├── login/page.tsx       # Email/password login
│   │   ├── register/page.tsx    # Register + email verification
│   │   └── forgot-password/page.tsx
│   │
│   └── (app)/                   # Route group: authenticated app shell
│       ├── layout.tsx           # Sidebar + Header + Outlet
│       ├── dashboard/page.tsx   # Server Component: summary + charts
│       ├── transactions/
│       │   ├── page.tsx         # List + filters (Server Component)
│       │   ├── new/page.tsx     # Form page (Client Component)
│       │   └── actions.ts       # Server Actions: CRUD
│       ├── categories/page.tsx  # CRUD categories
│       ├── budgets/page.tsx     # CRUD budgets + progress
│       ├── accounts/page.tsx    # CRUD accounts + balances
│       ├── settings/page.tsx    # Profile, preferences, danger zone
│       └── api/                 # Minimal: webhooks, cron only
│
├── api/                         # Global API routes (if needed)
│   ├── auth/callback/route.ts   # OAuth callback (future)
│   └── webhooks/route.ts        # Stripe, etc. (future)
│
└── layout.tsx                   # Root: html, body, providers
```

### 4.2 Component Architecture

```
Component Hierarchy (Key Pages)

DashboardPage (Server)
├── SummaryCards (Client) — uses useSuspenseQuery
├── Charts (Client) — Recharts, responsive
└── QuickActions (Client) — FAB shortcuts

TransactionsPage (Server)
├── TransactionFilters (Client) — URL state (nuqs)
├── TransactionList (Client) — Infinite scroll, TanStack Query
│   └── TransactionCard (Client) — Swipe actions, modal trigger
└── TransactionForm (Client) — RHF + Zod, Server Action

CategoriesPage (Server)
├── CategoryList (Client)
│   └── CategoryForm (Client) — IconPicker + ColorPicker
└── CategoryTree (Client) — Drag-drop reorder (future)

BudgetsPage (Server)
├── BudgetList (Client)
│   └── BudgetCard (Client) — ProgressBar, alert badge
└── BudgetForm (Client)

AccountsPage (Server)
├── AccountList (Client)
│   └── AccountForm (Client) — Type selector, balance input
└── AccountSelector (Client) — Used in TransactionForm

SettingsPage (Server)
├── ProfileForm (Client)
├── PreferencesForm (Client) — Locale, Currency, Theme
├── DangerZone (Client) — Delete account, export data
└── LanguageSwitcher (Client) — Flag dropdown
```

### 4.3 Data Flow Patterns

#### Server Component → Database (Read)
```
DashboardPage (Server)
    │
    ▼
createServerClient() → Supabase
    │
    ▼
SQL Query (RLS filtered by auth.uid())
    │
    ▼
Typed Result → Component Props
```

#### Client Component → Server Action → Database (Write)
```
TransactionForm (Client)
    │
    ▼
useActionState(createTransaction, initialState)
    │
    ▼
createTransaction (Server Action, 'use server')
    │
    ▼
validate with Zod schema
    │
    ▼
createServerClient() → Supabase INSERT (RLS enforced)
    │
    ▼
revalidatePath() → Cache Invalidation
    │
    ▼
Return { success, error } → Form State
    │
    ▼
Toast / Redirect / Optimistic Update
```

#### Real-time Updates (Budgets, Shared Wallets - Future)
```
Supabase Realtime Subscription (Client)
    │
    ▼
on INSERT/UPDATE/DELETE → Invalidate TanStack Query Keys
    │
    ▼
Query Refetch → UI Update
```

### 4.4 State Management Map

| State Type | Store | Persistence | Scope |
|------------|-------|-------------|-------|
| **Theme** | `theme-store.ts` | localStorage + cookie | Global |
| **Locale** | `locale-store.ts` | cookie + URL prefix | Global |
| **Sidebar Open** | `ui-store.ts` | memory | Session |
| **Modals/Toasts** | `ui-store.ts` | memory | Session |
| **Auth User** | Supabase Auth | HttpOnly cookie | Session |
| **Transactions** | TanStack Query | memory + cache | Per-query |
| **Categories** | TanStack Query | memory + cache | Per-query |
| **Accounts** | TanStack Query | memory + cache | Per-query |
| **Budgets** | TanStack Query | memory + cache | Per-query |
| **Form Inputs** | React Hook Form | memory | Per-form |
| **Filters/Sort** | URL Search Params (nuqs) | URL | Shareable |

## 5. API Design (Server Actions)

### 5.1 Transaction Actions
```typescript
// src/app/[locale]/(app)/transactions/actions.ts
export async function createTransaction(formData: FormData): Promise<ActionResult>
export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult>
export async function deleteTransaction(id: string): Promise<ActionResult>
export async function duplicateTransaction(id: string): Promise<ActionResult>
export async function bulkDeleteTransactions(ids: string[]): Promise<ActionResult>
```

### 5.2 Category Actions
```typescript
// src/app/[locale]/(app)/categories/actions.ts
export async function createCategory(formData: FormData): Promise<ActionResult>
export async function updateCategory(id: string, formData: FormData): Promise<ActionResult>
export async function deleteCategory(id: string): Promise<ActionResult>
export async function reorderCategories(ids: string[]): Promise<ActionResult>
export async function getDefaultCategories(): Promise<Category[]>
```

### 5.3 Budget Actions
```typescript
// src/app/[locale]/(app)/budgets/actions.ts
export async function createBudget(formData: FormData): Promise<ActionResult>
export async function updateBudget(id: string, formData: FormData): Promise<ActionResult>
export async function deleteBudget(id: string): Promise<ActionResult>
export async function checkBudgetAlerts(): Promise<BudgetAlert[]>
```

### 5.4 Account Actions
```typescript
// src/app/[locale]/(app)/accounts/actions.ts
export async function createAccount(formData: FormData): Promise<ActionResult>
export async function updateAccount(id: string, formData: FormData): Promise<ActionResult>
export async function deleteAccount(id: string): Promise<ActionResult>
export async function transferBetweenAccounts(fromId: string, toId: string, amount: number): Promise<ActionResult>
```

### 5.5 Settings Actions
```typescript
// src/app/[locale]/(app)/settings/actions.ts
export async function updateProfile(formData: FormData): Promise<ActionResult>
export async function updatePreferences(formData: FormData): Promise<ActionResult>
export async function changePassword(formData: FormData): Promise<ActionResult>
export async function exportData(format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob>
export async function deleteAccount(): Promise<ActionResult>
```

## 6. Authentication & Authorization

### 6.1 Auth Flow
```
1. User visits /[locale]/dashboard
2. Middleware checks session cookie
3. No session → redirect to /[locale]/auth/login
4. Login page → Server Action: signInWithPassword(email, password)
5. Supabase sets auth cookies (access_token, refresh_token)
6. Middleware validates JWT on subsequent requests
7. Server Components: createServerClient().auth.getUser()
8. RLS policies enforce user_id = auth.uid()
```

### 6.2 Session Management
- **Access Token**: 1 hour (JWT in HttpOnly cookie)
- **Refresh Token**: 30 days (HttpOnly cookie, rotating)
- **Middleware**: `updateSession()` refreshes on each request
- **Logout**: Server Action → `supabase.auth.signOut()` + clear cookies

### 6.3 Password Requirements (Zod)
```typescript
const passwordSchema = z.string()
  .min(8, 'Minimal 8 karakter')
  .regex(/[A-Z]/, 'Harus ada huruf besar')
  .regex(/[a-z]/, 'Harus ada huruf kecil')
  .regex(/[0-9]/, 'Harus ada angka')
  .regex(/[^A-Za-z0-9]/, 'Harus ada simbol');
```

## 7. Internationalization (i18n) Architecture

### 7.1 Routing Strategy
```
/[id]/dashboard          → Indonesian (default)
/[en]/dashboard          → English
/[zh]/dashboard          → Chinese
/[ja]/dashboard          → Japanese
/[ko]/dashboard          → Korean
```

### 7.2 Message Structure
```json
// src/messages/id.json
{
  "common": {
    "save": "Simpan",
    "cancel": "Batal",
    "delete": "Hapus",
    "edit": "Edit",
    "loading": "Memuat...",
    "empty": "Tidak ada data",
    "confirm": "Konfirmasi",
    "yes": "Ya",
    "no": "Tidak"
  },
  "auth": {
    "login": { "title": "Masuk", "email": "Email", "password": "Kata Sandi", ... },
    "register": { "title": "Daftar", "confirmPassword": "Konfirmasi Kata Sandi", ... }
  },
  "dashboard": {
    "summary": { "income": "Pemasukan", "expense": "Pengeluaran", "balance": "Saldo", "savingsRate": "Rasio Tabungan" },
    "charts": { "incomeVsExpense": "Pemasukan vs Pengeluaran", "byCategory": "Per Kategori" }
  },
  "transactions": { ... },
  "categories": { ... },
  "budgets": { ... },
  "accounts": { ... },
  "settings": { ... },
  "errors": { ... }
}
```

### 7.3 Locale Detection Priority
1. URL prefix (`/[locale]/...`) — **highest**
2. `NEXT_LOCALE` cookie
3. `Accept-Language` header
4. Default: `id`

## 8. Security Architecture

### 8.1 Defense Layers
| Layer | Implementation |
|-------|----------------|
| **Transport** | HTTPS only (Vercel), HSTS |
| **Headers** | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| **Auth** | Supabase Auth (bcrypt, rate limiting, brute force protection) |
| **Authorization** | RLS on every table (user_id = auth.uid()) |
| **Input Validation** | Zod schemas on every Server Action |
| **SQL Injection** | Parameterized queries (Supabase client) |
| **XSS** | React auto-escaping, no `dangerouslySetInnerHTML` |
| **CSRF** | SameSite=Lax cookies, Server Actions require form POST |
| **Secrets** | Environment variables only, no client exposure |

### 8.2 Content Security Policy
```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`
```

## 9. Performance Architecture

### 9.1 Rendering Strategy
| Page | Strategy | Reason |
|------|----------|--------|
| `/dashboard` | Server Component + Streaming | SEO, fast TTFB, progressive hydration |
| `/transactions` | Server Component (list) + Client (filters) | Initial HTML + interactive filters |
| `/transactions/new` | Client Component | Form interactivity, validation |
| `/settings` | Server Component (read) + Client (forms) | Profile data + interactive forms |

### 9.2 Caching Strategy
| Data | Cache | Invalidation |
|------|-------|--------------|
| **User Profile** | TanStack Query (5 min) | On profile update |
| **Transactions** | TanStack Query (2 min) | On any transaction mutation |
| **Categories** | TanStack Query (10 min) | On category CRUD |
| **Accounts** | TanStack Query (5 min) | On account/transaction mutation |
| **Budgets** | TanStack Query (2 min) | On budget/transaction mutation |
| **Static Assets** | Vercel Edge (1 year) | Content hash in filename |

### 9.3 Bundle Optimization
- **Code Splitting**: Automatic per route (App Router)
- **Dynamic Imports**: Heavy components (Charts, IconPicker, ColorPicker)
- **Tree Shaking**: ES modules, sideEffects: false in package.json
- **Font Optimization**: `next/font` — self-hosted Inter + JetBrains Mono
- **Image Optimization**: `next/image` — WebP/AVIF, responsive sizes

## 10. Deployment Architecture

### 10.1 Environments
| Environment | Branch | URL | Database |
|-------------|--------|-----|----------|
| **Production** | `main` | `https://moneytracker.app` | Supabase Production |
| **Preview** | `feature/*` | `https://pr-<num>.vercel.app` | Supabase Preview Branch |
| **Development** | Local | `http://localhost:3000` | Supabase Local (Docker) |

### 10.2 CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps: [checkout, setup-pnpm, install, pnpm lint, pnpm typecheck]
  test:
    runs-on: ubuntu-latest
    steps: [checkout, setup-pnpm, install, pnpm test]
  build:
    needs: [lint-typecheck, test]
    runs-on: ubuntu-latest
    steps: [checkout, setup-pnpm, install, pnpm build]
  deploy-preview:
    needs: build
    if: github.event_name == 'pull_request'
    steps: [vercel-action]
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    steps: [vercel-action --prod]
```

### 10.3 Supabase Branching
- **Main branch** → Production database
- **Preview branches** → Ephemeral databases (auto-created on PR)
- **Migrations**: Applied via `supabase db push` in CI

## 11. Monitoring & Observability

### 11.1 Error Tracking
- **Sentry** (Vercel integration) — Client + Server errors
- **Source Maps** — Uploaded on build

### 11.2 Performance Monitoring
- **Vercel Analytics** — Web Vitals (LCP, FID, CLS)
- **Vercel Speed Insights** — Real user monitoring

### 11.3 Database Monitoring
- **Supabase Dashboard** — Query performance, connection pool, storage
- **pg_stat_statements** — Slow query identification

### 11.4 Logging
- **Structured Logs**: `console.log(JSON.stringify({ level, message, context }))`
- **Vercel Logs** — Runtime logs with request correlation

## 12. Scalability Considerations

| Concern | Current Approach | Future Scale Path |
|---------|------------------|-------------------|
| **Read Heavy** | TanStack Query caching, Supabase connection pooling | Read replicas, materialized views |
| **Write Heavy** | Server Actions, RLS, triggers | Partitioned tables (by date), async processing |
| **Real-time** | Supabase Realtime (budgets) | Selective subscriptions, presence |
| **File Storage** | Not in MVP | Supabase Storage (receipts, exports) |
| **Background Jobs** | Not in MVP | Supabase Edge Functions / pg_cron |

## 13. Disaster Recovery

| Scenario | RTO | RPO | Mitigation |
|----------|-----|-----|------------|
| **Vercel Outage** | < 5 min | 0 | Multi-region edge, DNS failover |
| **Supabase Outage** | < 30 min | < 1 hr | Point-in-time recovery, read replica promotion |
| **Data Corruption** | < 1 hr | < 24 hr | Daily backups, WAL archiving, tested restores |
| **Security Breach** | Immediate | 0 | RLS, audit logs, rotation keys, incident response plan |

---

## 14. Decision Log (ADR)

| ID | Decision | Date | Status |
|----|----------|------|--------|
| 001 | Next.js App Router over Pages Router | 2026-09-10 | Accepted |
| 002 | Supabase over raw PostgreSQL + custom auth | 2026-09-10 | Accepted |
| 003 | Server Actions over API Routes for mutations | 2026-09-10 | Accepted |
| 004 | next-intl over next-i18next | 2026-09-10 | Accepted |
| 005 | Zustand over Redux/Context for client state | 2026-09-10 | Accepted |
| 006 | TanStack Query over SWR | 2026-09-10 | Accepted |
| 007 | Recharts over Chart.js / Tremor | 2026-09-10 | Accepted |
| 008 | pnpm over npm/yarn | 2026-09-10 | Accepted |

---

**Version**: 1.0  
**Last Updated**: 2026-09-10  
**Author**: Architecture Team  
**Review**: Required before implementation begins