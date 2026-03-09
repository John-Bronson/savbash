import { createBrowserClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import type { Database } from './database.types'

export const supabase = createBrowserClient<Database>(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY
)
