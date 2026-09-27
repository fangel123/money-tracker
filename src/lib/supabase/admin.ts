import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase dengan SERVICE ROLE KEY — melewati RLS sepenuhnya.
 * HANYA dipakai di kode server-side tepercaya (mis. cron job), TIDAK PERNAH
 * di komponen client atau di-import ke bundle browser.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diset di environment variables. " +
      "Ambil dari Supabase Dashboard > Project Settings > API > service_role key."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
