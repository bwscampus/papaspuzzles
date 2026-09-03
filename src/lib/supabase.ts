import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Browser client (auth only). Null when env vars are missing so static builds don't crash.
export const supabase: SupabaseClient | null =
    url && publishableKey ? createClient(url, publishableKey) : null;
