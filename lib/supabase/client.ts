import { createBrowserClient } from '@supabase/ssr'

function resolveSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_KEY
    || ''

  return { url, publishableKey }
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (browserClient) {
    return browserClient
  }

  const { url, publishableKey } = resolveSupabaseConfig()

  if (!url || !publishableKey) {
    return null
  }

  // createBrowserClient stores sessions in cookies (not localStorage) so the
  // Next.js middleware can read them during server-side route protection.
  browserClient = createBrowserClient(url, publishableKey)

  return browserClient
}

export const supabaseBrowser = createSupabaseBrowserClient()
