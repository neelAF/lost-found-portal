import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getClaimsForUser, normalizeClaim } from "@/lib/claims";
import { connectToDatabase } from "@/lib/mongodb";
import { isItemOwner } from "@/lib/lost-item-shared";
import { LostItemModel } from "@/models/LostItem";
import { ClaimModel } from "@/models/Claim";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    await connectToDatabase();

    const claims = await getClaimsForUser({
      email: session.user.email,
      mode: view === "received" ? "received" : view === "sent" ? "sent" : "chat",
    });

    return NextResponse.json(claims);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch claims right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { itemId?: string; message?: string }
      | null;

    const itemId = payload?.itemId?.trim() ?? "";
    const message = payload?.message?.trim() ?? "";

    if (!itemId) {
      return NextResponse.json({ error: "Item id is required." }, { status: 400 });
    }

    await connectToDatabase();

    const item = await LostItemModel.findById(itemId).lean();

    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    if (isItemOwner(item.userEmail, session.user.email)) {
      return NextResponse.json({ error: "You cannot claim your own item." }, { status: 403 });
    }

    if (item.status === "resolved") {
      return NextResponse.json({ error: "Resolved items cannot be claimed." }, { status: 400 });
    }

    const existingClaim = await ClaimModel.findOne({
      itemId,
      ownerEmail: session.user.email.toLowerCase(),
      status: { $in: ["pending", "approved", "completed"] },
    }).lean();

    if (existingClaim) {
      return NextResponse.json(
        { error: "You already have an active claim for this item." },
        { status: 409 },
      );
    }

    const claim = await ClaimModel.create({
      itemId,
      itemTitle: item.title,
      ownerEmail: session.user.email,
      finderEmail: item.userEmail,
      message,
      status: "pending",
    });

    return NextResponse.json({ claim: normalizeClaim(claim) }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create claim right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
