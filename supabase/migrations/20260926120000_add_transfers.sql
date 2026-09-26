-- Migrasi: dukungan fitur Transfer Antar Akun
-- Jalankan file ini di Supabase SQL Editor project money-tracker

-- 1. Izinkan type = 'transfer' di transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));

-- 2. category_id jadi opsional (transfer tidak butuh kategori)
ALTER TABLE public.transactions ALTER COLUMN category_id DROP NOT NULL;

-- 3. Kolom akun tujuan (hanya diisi kalau type = 'transfer')
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS to_account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT;

-- 4. Pastikan konsistensi data: transfer wajib punya to_account_id (beda dari account_id)
--    & tidak boleh punya category_id; selain transfer wajib punya category_id.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transfer_consistency;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transfer_consistency CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL AND category_id IS NULL AND to_account_id <> account_id)
    OR
    (type <> 'transfer' AND category_id IS NOT NULL AND to_account_id IS NULL)
  );

-- 5. Update trigger saldo: dukung income, expense, dan transfer (dua akun sekaligus)
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- revert efek transaksi lama
    IF OLD.type = 'income' THEN
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
    END IF;
    -- terapkan efek transaksi baru
    IF NEW.type = 'income' THEN
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN
      UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    ELSIF NEW.type = 'transfer' THEN
      UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN
      UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    ELSIF OLD.type = 'transfer' THEN
      UPDATE public.accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
-- Trigger `transaction_balance_update` yang sudah ada otomatis memakai fungsi baru ini (CREATE OR REPLACE).
