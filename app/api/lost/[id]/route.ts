import { isValidObjectId } from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { isItemOwner } from "@/lib/lost-item-shared";
import { normalizeLostItem } from "@/lib/lost-items";
import { connectToDatabase } from "@/lib/mongodb";
import { LostItemModel } from "@/models/LostItem";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
    }

    await connectToDatabase();
    const existingItem = await LostItemModel.findById(id).lean();

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    if (!isItemOwner(existingItem.userEmail, session.user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const updatedItem = await LostItemModel.findByIdAndUpdate(
      id,
      { $set: { status: "resolved" } },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!updatedItem) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({
      item: normalizeLostItem(updatedItem, { includeContactNumber: true }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the item right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
