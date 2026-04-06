import { ClaimModel } from "@/models/Claim";
import { MessageModel } from "@/models/Message";
import type { Claim, ChatMessage, ClaimStatus } from "@/lib/claim-shared";

export function normalizeClaim(item: {
  _id: { toString(): string } | string;
  itemId: string;
  itemTitle: string;
  ownerEmail: string;
  finderEmail: string;
  message?: string;
  status?: string;
  createdAt: Date | string;
}): Claim {
  return {
    id: item._id.toString(),
    itemId: item.itemId,
    itemTitle: item.itemTitle,
    ownerEmail: item.ownerEmail.trim().toLowerCase(),
    finderEmail: item.finderEmail.trim().toLowerCase(),
    message: item.message?.trim() ?? "",
    status: normalizeClaimStatus(item.status),
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

export function normalizeMessage(item: {
  _id: { toString(): string } | string;
  claimId: string;
  senderEmail: string;
  receiverEmail: string;
  message: string;
  createdAt: Date | string;
}): ChatMessage {
  return {
    id: item._id.toString(),
    claimId: item.claimId,
    senderEmail: item.senderEmail.trim().toLowerCase(),
    receiverEmail: item.receiverEmail.trim().toLowerCase(),
    message: item.message,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

export function normalizeClaimStatus(status?: string): ClaimStatus {
  if (status === "approved" || status === "rejected" || status === "completed") {
    return status;
  }

  return "pending";
}

export async function getClaimsForUser(options: {
  email: string;
  mode: "received" | "chat" | "sent";
}) {
  const normalizedEmail = options.email.trim().toLowerCase();
  const filter =
    options.mode === "received"
      ? { finderEmail: normalizedEmail }
      : options.mode === "sent"
        ? { ownerEmail: normalizedEmail }
        : {
            $and: [
              {
                $or: [{ finderEmail: normalizedEmail }, { ownerEmail: normalizedEmail }],
              },
              { status: { $in: ["approved", "completed"] } },
            ],
          };

  const claims = await ClaimModel.find(filter).sort({ createdAt: -1 }).lean();
  return claims.map(normalizeClaim);
}

export async function getMessagesForClaim(claimId: string) {
  const messages = await MessageModel.find({ claimId }).sort({ createdAt: 1 }).lean();
  return messages.map(normalizeMessage);
}
