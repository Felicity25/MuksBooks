import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !publishableKey) {
    return null
  }

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookies().getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies().set(name, value, options)
          })
        } catch {
          // The server component may not be able to set cookies in some read-only contexts.
        }
      }
    }
  })
}

export async function getAuthenticatedUser() {
  const client = createSupabaseServerClient()
  if (!client) return null

  const {
    data: { user },
    error
  } = await client.auth.getUser()

  if (error || !user) return null
  return user
}
