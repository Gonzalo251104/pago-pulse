import { cookies } from "next/headers";
import type { MemberRole } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthenticatedContext {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: MemberRole;
  isDemoMode: boolean;
}

export const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000099";
export const DEMO_DEVICE_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_WEBHOOK_SECRET =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export const DEMO_ROLE_COOKIE = "pagopulse_demo_role";

/**
 * Checks whether a given member role is authorized to access an OWNER-only resource.
 */
export function canManageDevices(role: MemberRole): boolean {
  return role === "OWNER";
}

/**
 * Resolves the current operator session and organization role.
 * Uses Supabase Auth + `organization_members` when configured, and falls back
 * to a local demo session when running in local development/testing.
 */
export async function getCurrentSession(): Promise<AuthenticatedContext | null> {
  const cookieStore = await cookies();
  const demoRoleCookie = cookieStore.get(DEMO_ROLE_COOKIE)?.value;

  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "your-supabase-anon-key";

  if (isSupabaseConfigured && !demoRoleCookie) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: membership } = await supabase
        .from("organization_members")
        .select(
          "role, organization_id, organizations ( id, name, slug )"
        )
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership) {
        const orgRecord = Array.isArray(membership.organizations)
          ? membership.organizations[0]
          : membership.organizations;

        return {
          userId: user.id,
          email: user.email ?? "operador@pagopulse.pe",
          fullName:
            (user.user_metadata?.full_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "Operador",
          organizationId: membership.organization_id,
          organizationName: orgRecord?.name ?? "Mi Comercio",
          organizationSlug: orgRecord?.slug ?? "mi-comercio",
          role: (membership.role as MemberRole) ?? "CASHIER",
          isDemoMode: false,
        };
      }
    } catch {
      // Fall through to demo session if local Supabase is unreachable
    }
  }

  // Default to demo session when demo cookie is present or Supabase Auth is not configured
  const role: MemberRole = demoRoleCookie === "CASHIER" ? "CASHIER" : "OWNER";

  return {
    userId:
      role === "OWNER"
        ? "00000000-0000-4000-8000-000000000010"
        : "00000000-0000-4000-8000-000000000011",
    email:
      role === "OWNER" ? "dueno@bodegadonpepe.pe" : "caja1@bodegadonpepe.pe",
    fullName: role === "OWNER" ? "Don Pepe (Dueño)" : "Cajero Turno Día",
    organizationId: DEMO_ORG_ID,
    organizationName: "Bodega Don Pepe",
    organizationSlug: "bodega-don-pepe",
    role,
    isDemoMode: true,
  };
}
