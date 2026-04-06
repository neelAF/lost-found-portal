import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { isClaimParticipant } from "@/lib/claim-shared";
import { getMessagesForClaim, normalizeClaim, normalizeMessage } from "@/lib/claims";
import { connectToDatabase } from "@/lib/mongodb";
import { ClaimModel } from "@/models/Claim";
import { MessageModel } from "@/models/Message";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get("claimId")?.trim() ?? "";

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required." }, { status: 400 });
    }

    await connectToDatabase();

    const claim = await ClaimModel.findById(claimId).lean();

    if (!claim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const normalizedClaim = normalizeClaim(claim);

    if (!isClaimParticipant(normalizedClaim, session.user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (!["approved", "completed"].includes(normalizedClaim.status)) {
      return NextResponse.json({ error: "Chat is not available for this claim." }, { status: 400 });
    }

    const messages = await getMessagesForClaim(claimId);
    return NextResponse.json({ claim: normalizedClaim, messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch messages right now.";

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
      | { claimId?: string; message?: string }
      | null;

    const claimId = payload?.claimId?.trim() ?? "";
    const message = payload?.message?.trim() ?? "";

    if (!claimId || !message) {
      return NextResponse.json({ error: "claimId and message are required." }, { status: 400 });
    }

    await connectToDatabase();

    const claim = await ClaimModel.findById(claimId).lean();

    if (!claim) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }

    const normalizedClaim = normalizeClaim(claim);

    if (!isClaimParticipant(normalizedClaim, session.user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (normalizedClaim.status !== "approved") {
      return NextResponse.json({ error: "Chat is not active for this claim." }, { status: 400 });
    }

    const senderEmail = session.user.email.toLowerCase();
    const receiverEmail =
      senderEmail === normalizedClaim.ownerEmail
        ? normalizedClaim.finderEmail
        : normalizedClaim.ownerEmail;

    const createdMessage = await MessageModel.create({
      claimId,
      senderEmail,
      receiverEmail,
      message,
    });

    return NextResponse.json({ message: normalizeMessage(createdMessage) }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send message right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
