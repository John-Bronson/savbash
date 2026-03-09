import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

declare global {
	namespace App {
		interface Locals {
			supabase: ReturnType<typeof import('@supabase/ssr').createServerClient<Database>>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
			profile: Profile | null;
		}
	}
}

export {};
