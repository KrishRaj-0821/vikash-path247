import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession, SessionUser } from "@/lib/session";

/**
 * POST /api/auth/municipal
 * Body: { email, employeeId, name? }
 *
 * STRICT municipal login — only verified government officials.
 * - email must end with `.gov.in`
 * - existing user must exist with role MUNICIPAL and matching employeeId
 * - casual signups are blocked
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { email, employeeId, name } = body as {
      email?: string;
      employeeId?: string;
      name?: string;
    };

    if (!email || !employeeId) {
      return NextResponse.json(
        { error: "Email and employeeId are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanEmpId = String(employeeId).trim();

    // Validate government email domain
    if (!cleanEmail.endsWith(".gov.in")) {
      return NextResponse.json(
        { error: "Only official government email domains (.gov.in) are allowed." },
        { status: 403 }
      );
    }

    const existing = await db.user.findUnique({ where: { email: cleanEmail } });

    if (!existing) {
      // Block casual signups to maintain integrity
      return NextResponse.json(
        {
          error:
            "Unauthorized. Casual municipal signups are blocked. Contact your department admin for verified access.",
        },
        { status: 403 }
      );
    }

    if (existing.role !== "MUNICIPAL") {
      return NextResponse.json(
        { error: "This email is registered as a non-municipal account." },
        { status: 403 }
      );
    }

    if (existing.employeeId !== cleanEmpId) {
      return NextResponse.json(
        { error: "Employee ID does not match our records." },
        { status: 403 }
      );
    }

    // Optionally update display name if provided
    if (name && String(name).trim() && existing.name !== String(name).trim()) {
      await db.user.update({
        where: { id: existing.id },
        data: { name: String(name).trim() },
      });
    }

    await setSession(existing.id);
    return NextResponse.json({ user: toSessionUser(existing) });
  } catch (err) {
    console.error("[auth/municipal] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed." },
      { status: 500 }
    );
  }
}

function toSessionUser(u: {
  id: string;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  swachhCoins: number;
  department: string | null;
  employeeId: string | null;
  verified: boolean;
}): SessionUser {
  return {
    id: u.id,
    role: u.role as "CITIZEN" | "MUNICIPAL",
    name: u.name,
    email: u.email,
    phone: u.phone,
    swachhCoins: u.swachhCoins,
    department: u.department,
    employeeId: u.employeeId,
    verified: u.verified,
  };
}
