import { isValidObjectId } from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { isClaimFinder, isClaimParticipant } from "@/lib/claim-shared";
import { normalizeClaim } from "@/lib/claims";
import { connectToDatabase } from "@/lib/mongodb";
import { ClaimModel } from "@/models/Claim";
import { LostItemModel } from "@/models/LostItem";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid claim id." }, { status: 400 });
    }

    await connectToDatabase();

    const claim = await ClaimModel.findById(id).lean();

    if (!claim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const normalizedClaim = normalizeClaim(claim);

    if (!isClaimParticipant(normalizedClaim, session.user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    return NextResponse.json({ claim: normalizedClaim });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch claim right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid claim id." }, { status: 400 });
    }

    const payload = (await request.json().catch(() => null)) as
      | { action?: "approve" | "reject" | "complete" }
      | null;

    const action = payload?.action;

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    await connectToDatabase();

    const claim = await ClaimModel.findById(id).lean();

    if (!claim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const normalizedClaim = normalizeClaim(claim);

    if (action === "approve" || action === "reject") {
      if (!isClaimFinder(normalizedClaim, session.user.email)) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      if (normalizedClaim.status !== "pending") {
        return NextResponse.json({ error: "Only pending claims can be updated." }, { status: 400 });
      }

      const updatedClaim = await ClaimModel.findByIdAndUpdate(
        id,
        { $set: { status: action === "approve" ? "approved" : "rejected" } },
        { new: true, runValidators: true },
      ).lean();

      if (!updatedClaim) {
        return NextResponse.json({ error: "Claim not found." }, { status: 404 });
      }

      if (action === "approve") {
        await LostItemModel.findByIdAndUpdate(
          normalizedClaim.itemId,
          { $set: { status: "resolved" } },
          { runValidators: true },
        );
      }

      return NextResponse.json({ claim: normalizeClaim(updatedClaim) });
    }

    if (!isClaimParticipant(normalizedClaim, session.user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (normalizedClaim.status !== "approved") {
      return NextResponse.json({ error: "Only approved claims can be completed." }, { status: 400 });
    }

    await LostItemModel.findByIdAndUpdate(
      normalizedClaim.itemId,
      { $set: { status: "resolved" } },
      { runValidators: true },
    );

    const completedClaim = await ClaimModel.findByIdAndUpdate(
      id,
      { $set: { status: "completed" } },
      { new: true, runValidators: true },
    ).lean();

    if (!completedClaim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    return NextResponse.json({ claim: normalizeClaim(completedClaim) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update claim right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
