import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { normalizeLostItem } from "@/lib/lost-items";
import { LostItemModel } from "@/models/LostItem";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDatabase();

    const items = await LostItemModel.find({
      userEmail: session.user.email.toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      items.map((item) => normalizeLostItem(item, { includeContactNumber: true })),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch your items right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
