import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as speakeasy from "speakeasy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, totpCode } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin';
    const twoFactorSecret = process.env.ADMIN_2FA_SECRET;

    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (twoFactorSecret) {
      if (!totpCode) {
        return NextResponse.json(
          { error: "Authenticator code required" },
          { status: 401 }
        );
      }

      try {
        const isValid = speakeasy.totp.verify({
          secret: twoFactorSecret,
          encoding: 'base32',
          token: totpCode,
          window: 1 // allow 30 seconds drift either side
        });

        if (!isValid) {
          return NextResponse.json(
            { error: "Invalid authenticator code" },
            { status: 401 }
          );
        }
      } catch (err) {
        return NextResponse.json(
          { error: "Error verifying authenticator code" },
          { status: 401 }
        );
      }
    }

    // Set HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'admin_session',
      value: 'authenticated',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

