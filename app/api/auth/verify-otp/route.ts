import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { OtpModel } from "@/models/Otp";

type VerifyOtpPayload = {
  email?: string;
  otp?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as VerifyOtpPayload | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const otp = body?.otp?.trim() ?? "";

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
    }

    await connectToDatabase();

    const otpRecord = await OtpModel.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
    }

    if (otpRecord.expiresAt.getTime() < Date.now()) {
      await OtpModel.deleteMany({ email });
      return NextResponse.json({ error: "OTP has expired." }, { status: 400 });
    }

    const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValidOtp) {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
    }

    const response = NextResponse.json({ message: "OTP verified successfully." });
    response.cookies.set("password-reset-email", email, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to verify OTP right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
