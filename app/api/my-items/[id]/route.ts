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

    const item = await LostItemModel.findByIdAndUpdate(
      id,
      { $set: { status: "resolved" } },
      { new: true, runValidators: true },
    ).lean();

    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({
      item: normalizeLostItem(item, { includeContactNumber: true }),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update your item right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
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

    const item = await LostItemModel.findByIdAndDelete(id).lean();

    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete your item right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
