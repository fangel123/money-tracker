-- Create Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    deadline DATE,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Debts Table
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payable', 'receivable')),
    amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Policies for Goals
CREATE POLICY "Users can manage their own goals" 
ON public.goals FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Policies for Debts
CREATE POLICY "Users can manage their own debts" 
ON public.debts FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Drop triggers if any
DROP TRIGGER IF EXISTS handle_updated_at_goals ON public.goals;
DROP TRIGGER IF EXISTS handle_updated_at_debts ON public.debts;

-- Triggers for updated_at using existing custom function
CREATE TRIGGER handle_updated_at_goals
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_updated_at_debts
    BEFORE UPDATE ON public.debts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
