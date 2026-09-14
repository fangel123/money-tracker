-- Create Planners Table
CREATE TABLE IF NOT EXISTS public.planners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes_top TEXT,
    notes_bottom TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Planner Items Table
CREATE TABLE IF NOT EXISTS public.planner_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planner_id UUID NOT NULL REFERENCES public.planners(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('income', 'wajib', 'tabungan', 'kebutuhan')),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status_tag TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hapus policy & trigger lama agar aman dijalankan ulang
DROP POLICY IF EXISTS "Users can manage their own planners" ON public.planners;
DROP POLICY IF EXISTS "Users can view their own planner items" ON public.planner_items;
DROP POLICY IF EXISTS "Users can insert their own planner items" ON public.planner_items;
DROP POLICY IF EXISTS "Users can update their own planner items" ON public.planner_items;
DROP POLICY IF EXISTS "Users can delete their own planner items" ON public.planner_items;
DROP TRIGGER IF EXISTS handle_updated_at_planners ON public.planners;
DROP TRIGGER IF EXISTS handle_updated_at_planner_items ON public.planner_items;

-- Enable RLS
ALTER TABLE public.planners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_items ENABLE ROW LEVEL SECURITY;

-- Policies for Planners
CREATE POLICY "Users can manage their own planners" 
ON public.planners FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Policies for Planner Items (Join with planners)
CREATE POLICY "Users can view their own planner items" 
ON public.planner_items FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.planners p WHERE p.id = planner_items.planner_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own planner items" 
ON public.planner_items FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.planners p WHERE p.id = planner_items.planner_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can update their own planner items" 
ON public.planner_items FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.planners p WHERE p.id = planner_items.planner_id AND p.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own planner items" 
ON public.planner_items FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.planners p WHERE p.id = planner_items.planner_id AND p.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_planners
    BEFORE UPDATE ON public.planners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER handle_updated_at_planner_items
    BEFORE UPDATE ON public.planner_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
