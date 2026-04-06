import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

type UpdateUserPayload = {
  name?: string;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email: session.user.email.toLowerCase() }).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch profile right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as UpdateUserPayload | null;
    const name = body?.name?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findOneAndUpdate(
      { email: session.user.email.toLowerCase() },
      { $set: { name } },
      { new: true, runValidators: true },
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update profile right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
