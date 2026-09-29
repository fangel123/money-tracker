-- Migrasi: sinkronkan item Planner dengan transaksi yang dibuatnya
-- Jalankan di Supabase SQL Editor SEBELUM kode barunya di-deploy.

-- 1. Kolom tautan: item planner "mengingat" transaksi yang dibuat saat dibayar/diterima
ALTER TABLE public.planner_items
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- 2. Arah sebaliknya: kalau transaksi yang tertaut dihapus (mis. dari halaman Transaksi),
--    item planner otomatis kembali ke "belum lunas". Pakai BEFORE DELETE supaya jalan
--    sebelum aksi ON DELETE SET NULL milik foreign key.
CREATE OR REPLACE FUNCTION public.reset_planner_item_on_transaction_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.planner_items
    SET status_tag = NULL, transaction_id = NULL
    WHERE transaction_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS planner_reset_on_transaction_delete ON public.transactions;
CREATE TRIGGER planner_reset_on_transaction_delete
  BEFORE DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.reset_planner_item_on_transaction_delete();

-- 3. Tautkan item LAMA yang sudah lunas/diterima, HANYA kalau cocoknya tepat satu
--    (catatan "(Planner) <nama>" + jumlah sama). Kalau ambigu (lebih dari satu kandidat),
--    dilewati supaya tidak salah menghapus transaksi orang/bulan lain.
UPDATE public.planner_items pi
SET transaction_id = m.tx_id
FROM (
  SELECT pi2.id AS item_id, (array_agg(t.id))[1] AS tx_id, count(*) AS cnt
  FROM public.planner_items pi2
  JOIN public.planners p ON p.id = pi2.planner_id
  JOIN public.transactions t
    ON t.user_id = p.user_id
   AND t.note = '(Planner) ' || pi2.name
   AND t.amount = pi2.amount
  WHERE pi2.transaction_id IS NULL
    AND (pi2.status_tag ILIKE '%lunas%' OR pi2.status_tag ILIKE '%diterima%')
  GROUP BY pi2.id
) m
WHERE pi.id = m.item_id AND m.cnt = 1;
