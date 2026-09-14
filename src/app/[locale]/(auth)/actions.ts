"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const locale = formData.get("locale") as string || "id";

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.log("Login Error:", error);
    return { error: "Email atau kata sandi salah" };
  }
  
  console.log("Login Success! User:", data.user?.id);

  // Revalidate the layout
  revalidatePath("/", "layout");
  return { success: true };
}
