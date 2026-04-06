import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type ChangePasswordPayload = {
  email?: string;
  oldPassword?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as ChangePasswordPayload | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const oldPassword = body?.oldPassword ?? "";
    const newPassword = body?.newPassword ?? "";

    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Email, old password, and new password are required." },
        { status: 400 },
      );
    }

    if (email !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to change password right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
