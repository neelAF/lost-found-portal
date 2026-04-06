import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { OtpModel } from "@/models/Otp";
import { UserModel } from "@/models/User";

type ResetPasswordPayload = {
  email?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ResetPasswordPayload | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const newPassword = body?.newPassword ?? "";
    const cookieStore = await cookies();
    const verifiedEmail = cookieStore.get("password-reset-email")?.value ?? "";

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required." },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    if (!verifiedEmail || verifiedEmail !== email) {
      return NextResponse.json({ error: "OTP verification required." }, { status: 403 });
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    await OtpModel.deleteMany({ email });

    const response = NextResponse.json({ message: "Password reset successfully." });
    response.cookies.set("password-reset-email", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reset password right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
