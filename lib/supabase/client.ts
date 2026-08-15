import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    return null
  }

  if (browserClient) {
    return browserClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !publishableKey) {
    return null
  }

  // createBrowserClient stores sessions in cookies (not localStorage) so the
  // Next.js middleware can read them during server-side route protection.
  browserClient = createBrowserClient(url, publishableKey)

  return browserClient
}

export const supabaseBrowser = createSupabaseBrowserClient()
