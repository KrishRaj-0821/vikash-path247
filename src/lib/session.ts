import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "vikash_session";

export interface SessionUser {
  id: string;
  role: "CITIZEN" | "MUNICIPAL";
  name: string;
  email?: string | null;
  phone?: string | null;
  swachhCoins: number;
  department?: string | null;
  employeeId?: string | null;
  verified: boolean;
}

/**
 * Get the currently logged-in user from the session cookie.
 * Returns null if not logged in.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const user = await db.user.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      phone: true,
      swachhCoins: true,
      department: true,
      employeeId: true,
      verified: true,
    },
  });

  if (!user) return null;
  return user as SessionUser;
}

/**
 * Set the session cookie for a user.
 */
export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear the session cookie (logout).
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
