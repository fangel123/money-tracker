# Money Tracker

Aplikasi pencatat keuangan pribadi yang modern, responsif, dan multi-bahasa. Dibangun dengan Next.js 14, TypeScript, Tailwind CSS, dan Supabase.

## ✨ Fitur Utama

- 📊 **Dashboard** - Ringkasan pemasukan, pengeluaran, saldo, dan rasio tabungan
- 💰 **Transaksi** - CRUD lengkap dengan filter, pencarian, dan pagination
- 🏷️ **Kategori** - Kustom kategori income/expense dengan icon & warna
- 🎯 **Budget** - Anggaran per kategori dengan progress bar & peringatan
- 🏦 **Akun** - Multi-akun (tunai, bank, e-wallet, kartu kredit, investasi)
- ⚙️ **Pengaturan** - Profil, preferensi (bahasa, mata uang, tema), keamanan, data
- 🌐 **Multi-bahasa** - Indonesia, English, 中文, 日本語, 한국어
- 🌙 **Dark Mode** - Light, Dark, System preference
- 📱 **Responsif** - Mobile-first dengan bottom navigation & sidebar desktop
- 🔐 **Auth** - Email/password dengan Supabase Auth

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| State (Server) | TanStack Query 5 |
| State (Client) | Zustand 4 |
| Forms | React Hook Form + Zod |
| i18n | next-intl 3 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Package Manager | pnpm 9 |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 9+
- Supabase account (atau Docker untuk local)

### Installation

```bash
# Clone & install
cd money-tracker
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
pnpm dev
```

### Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations:
   ```bash
   # Local development (requires Docker)
   supabase start
   supabase db push
   
   # Or push to remote
   supabase link --project-ref your-project-ref
   supabase db push
   ```
3. Copy credentials to `.env.local`

## 📁 Project Structure

```
src/
├── app/
│   ├── [locale]/              # i18n routing
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   └── (app)/             # Protected app pages
│   │       ├── dashboard/
│   │       ├── transactions/
│   │       ├── categories/
│   │       ├── budgets/
│   │       ├── accounts/
│   │       └── settings/
│   ├── api/                   # API routes (minimal)
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Redirect to /[locale]/dashboard
│   └── globals.css            # Global styles + CSS variables
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── dashboard/             # Dashboard components
│   ├── transactions/          # Transaction components
│   ├── categories/            # Category components
│   ├── budgets/               # Budget components
│   ├── accounts/              # Account components
│   ├── settings/              # Settings components
│   ├── layout/                # Sidebar, Header, BottomNav
│   ├── providers/             # Query, Theme, I18n providers
│   └── common/                # Shared components (EmptyState, etc.)
├── hooks/                     # Custom React hooks
├── lib/
│   ├── supabase/              # Supabase clients (server/browser)
│   ├── validators/            # Zod schemas
│   ├── queries/               # TanStack Query keys & functions
│   └── utils.ts               # Utility functions
├── store/                     # Zustand stores (theme, locale, UI)
├── types/                     # TypeScript types
├── i18n/                      # next-intl configuration
└── messages/                  # Translation files (id, en, zh, ja, ko)
```

## 📝 Available Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript check
pnpm test         # Run unit tests (Vitest)
pnpm test:e2e     # Run E2E tests (Playwright)
pnpm format       # Format with Prettier
pnpm db:push      # Push Supabase migrations
pnpm db:types     # Generate TypeScript types from Supabase
pnpm db:studio    # Open Supabase Studio
pnpm analyze      # Bundle analyzer
```

## 🌍 Internationalization

Supported locales: `id` (default), `en`, `zh`, `ja`, `ko`

Translation files: `src/messages/{locale}.json`

Add new locale:
1. Add to `src/i18n/routing.ts` locales array
2. Create `src/messages/{locale}.json` (copy from `id.json`)
3. Translate all keys

## 🗄 Database Schema

Key tables:
- `profiles` - User profile (extends auth.users)
- `accounts` - Financial accounts
- `categories` - Transaction categories (hierarchical)
- `transactions` - Income/expense records
- `budgets` - Spending limits per category/period

All tables have RLS policies enforcing `user_id = auth.uid()`.

## 🔒 Security

- Row Level Security (RLS) on all tables
- Server-side validation with Zod
- Server Actions for mutations (no client-side API keys)
- CSP headers configured
- HttpOnly auth cookies

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Add environment variables
3. Deploy

### Supabase
- Production database on Supabase Cloud
- Preview databases for PRs (Supabase Branching)

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.