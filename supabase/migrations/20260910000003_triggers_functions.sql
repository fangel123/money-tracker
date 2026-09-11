-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, locale)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_user_meta_data->>'locale', 'id'));
  
  -- Insert default income categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default, sort_order)
  VALUES
    (NEW.id, 'Gaji', 'income', 'briefcase', '#059669', TRUE, 1),
    (NEW.id, 'Freelance', 'income', 'laptop', '#0891b2', TRUE, 2),
    (NEW.id, 'Investasi', 'income', 'trending-up', '#0d9488', TRUE, 3),
    (NEW.id, 'Hadiah', 'income', 'gift', '#7c3aed', TRUE, 4),
    (NEW.id, 'Lainnya', 'income', 'plus-circle', '#64748b', TRUE, 5);

  -- Insert default expense categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default, sort_order)
  VALUES
    (NEW.id, 'Makanan', 'expense', 'utensils-crossed', '#ef4444', TRUE, 1),
    (NEW.id, 'Transport', 'expense', 'car', '#f97316', TRUE, 2),
    (NEW.id, 'Belanja', 'expense', 'shopping-bag', '#eab308', TRUE, 3),
    (NEW.id, 'Hiburan', 'expense', 'gamepad-2', '#a855f7', TRUE, 4),
    (NEW.id, 'Kesehatan', 'expense', 'heart-pulse', '#ec4899', TRUE, 5),
    (NEW.id, 'Pendidikan', 'expense', 'graduation-cap', '#06b6d4', TRUE, 6),
    (NEW.id, 'Tagihan', 'expense', 'file-text', '#6366f1', TRUE, 7),
    (NEW.id, 'Lainnya', 'expense', 'more-horizontal', '#64748b', TRUE, 8);

  -- Create default accounts
  INSERT INTO public.accounts (user_id, name, type, currency, balance, icon, color, sort_order)
  VALUES
    (NEW.id, 'Tunai', 'cash', 'IDR', 0, 'wallet', '#22c55e', 1),
    (NEW.id, 'Bank', 'bank', 'IDR', 0, 'building-2', '#3b82f6', 2),
    (NEW.id, 'E-Wallet', 'ewallet', 'IDR', 0, 'smartphone', '#8b5cf6', 3);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
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

-- Function to update account balance on transaction changes
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