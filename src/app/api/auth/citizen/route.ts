import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession, SessionUser } from "@/lib/session";

/**
 * POST /api/auth/citizen
 * Body: { phone?, name?, otp?, guest? }
 *
 * - If guest=true OR no phone: create a guest citizen ("Guest Nagrik").
 * - If phone provided: find by phone or create a new CITIZEN user.
 *   Mock OTP — any 4-digit code is accepted.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { phone, name, email, otp, guest } = body as {
      phone?: string;
      name?: string;
      email?: string;
      otp?: string;
      guest?: boolean;
    };

    // ----- Guest Nagrik path -----
    if (guest || (!phone && !email)) {
      const guestUser = await db.user.create({
        data: {
          role: "CITIZEN",
          name: "Guest Nagrik",
          verified: false,
        },
      });
      await setSession(guestUser.id);
      return NextResponse.json({ user: toSessionUser(guestUser) });
    }

    // ----- Google Email path -----
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanName = name && String(name).trim() ? String(name).trim() : "Nagrik";

      let user = await db.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        user = await db.user.create({
          data: {
            role: "CITIZEN",
            name: cleanName,
            email: cleanEmail,
            verified: true,
          },
        });
      } else if (user.role !== "CITIZEN") {
        return NextResponse.json(
          { error: "This email is linked to a municipal account. Please use official login." },
          { status: 403 }
        );
      }

      await setSession(user.id);
      return NextResponse.json({ user: toSessionUser(user) });
    }

    // ----- Phone + OTP path -----
    // Mock OTP validation: accept any 4-digit code (skip if otp not provided for dev convenience)
    if (otp && !/^\d{4}$/.test(String(otp))) {
      return NextResponse.json(
        { error: "OTP must be a 4-digit code." },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    const cleanName = name && String(name).trim() ? String(name).trim() : "Nagrik";

    let user = await db.user.findUnique({ where: { phone: cleanPhone } });
    if (!user) {
      user = await db.user.create({
        data: {
          role: "CITIZEN",
          name: cleanName,
          phone: cleanPhone,
          verified: true,
        },
      });
    } else if (user.role !== "CITIZEN") {
      return NextResponse.json(
        { error: "This phone number is linked to a municipal account. Please use municipal login." },
        { status: 403 }
      );
    }

    await setSession(user.id);
    return NextResponse.json({ user: toSessionUser(user) });
  } catch (err) {
    console.error("[auth/citizen] Error:", err);
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
