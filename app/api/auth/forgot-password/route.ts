import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { sendOtpEmail } from "@/lib/mailer";
import { connectToDatabase } from "@/lib/mongodb";
import { OtpModel } from "@/models/Otp";
import { UserModel } from "@/models/User";

type ForgotPasswordPayload = {
  email?: string;
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ForgotPasswordPayload | null;
    const email = body?.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json(
        { message: "If that account exists, an OTP has been sent to the email address." },
        { status: 200 },
      );
    }

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpModel.deleteMany({ email });
    await OtpModel.create({
      email,
      otp: hashedOtp,
      expiresAt,
    });

    await sendOtpEmail(email, otp);

    return NextResponse.json({
      message: "If that account exists, an OTP has been sent to the email address.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send OTP right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
