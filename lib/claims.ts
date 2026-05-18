import { ClaimModel } from "@/models/Claim";
import { LostItemModel } from "@/models/LostItem";
import { MessageModel } from "@/models/Message";
import { UserModel } from "@/models/User";
import type { Claim, ChatMessage, ClaimRequestType, ClaimStatus } from "@/lib/claim-shared";
import type { LostItemType } from "@/lib/lost-item-shared";

type ClaimSource = {
  _id: { toString(): string } | string;
  itemId: string;
  itemTitle: string;
  itemType?: LostItemType;
  itemLocation?: string;
  itemImage?: string;
  requestType?: string;
  requesterName?: string;
  requesterImage?: string;
  ownerName?: string;
  ownerImage?: string;
  finderName?: string;
  finderImage?: string;
  ownerEmail: string;
  finderEmail: string;
  message?: string;
  latestMessage?: string;
  latestMessageAt?: Date | string;
  status?: string;
  createdAt: Date | string;
};

type ClaimSourceLike = ClaimSource & {
  toObject?: () => ClaimSource;
};

function toPlainClaimSource(claim: ClaimSourceLike): ClaimSource {
  return typeof claim.toObject === "function" ? claim.toObject() : claim;
}

export function normalizeClaim(item: {
  _id: { toString(): string } | string;
  itemId: string;
  itemTitle: string;
  itemType?: LostItemType;
  itemLocation?: string;
  itemImage?: string;
  requestType?: string;
  requesterName?: string;
  requesterImage?: string;
  ownerName?: string;
  ownerImage?: string;
  finderName?: string;
  finderImage?: string;
  ownerEmail: string;
  finderEmail: string;
  message?: string;
  latestMessage?: string;
  latestMessageAt?: Date | string;
  status?: string;
  createdAt: Date | string;
}): Claim {
  return {
    id: item._id.toString(),
    itemId: item.itemId,
    itemTitle: item.itemTitle,
    itemType: item.itemType,
    itemLocation: item.itemLocation,
    itemImage: item.itemImage,
    requestType: normalizeClaimRequestType(item.requestType),
    requesterName: item.requesterName,
    requesterImage: item.requesterImage,
    ownerName: item.ownerName,
    ownerImage: item.ownerImage,
    finderName: item.finderName,
    finderImage: item.finderImage,
    ownerEmail: item.ownerEmail.trim().toLowerCase(),
    finderEmail: item.finderEmail.trim().toLowerCase(),
    message: item.message?.trim() ?? "",
    latestMessage: item.latestMessage?.trim(),
    latestMessageAt: item.latestMessageAt ? new Date(item.latestMessageAt).toISOString() : undefined,
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

export function normalizeClaimRequestType(requestType?: string): ClaimRequestType | undefined {
  if (requestType === "ownership" || requestType === "finder-response") {
    return requestType;
  }

  return undefined;
}

function getFallbackRequestType(itemType?: LostItemType): ClaimRequestType | undefined {
  if (itemType === "lost") {
    return "finder-response";
  }

  if (itemType === "found") {
    return "ownership";
  }

  return undefined;
}

export async function getClaimsForUser(options: {
  email: string;
  mode: "received" | "chat" | "sent";
  requestType?: "ownership" | "finder-response";
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
  const normalizedClaims = await normalizeClaimsWithContext(claims);
  let filteredClaims = normalizedClaims;

  if (options.requestType === "ownership") {
    filteredClaims = normalizedClaims.filter(
      (claim) => claim.requestType === "ownership" || !claim.requestType,
    );
  }

  if (options.requestType === "finder-response") {
    filteredClaims = normalizedClaims.filter((claim) => claim.requestType === "finder-response");
  }

  if (options.mode === "chat") {
    return filteredClaims.sort(
      (first, second) =>
        new Date(second.latestMessageAt ?? second.createdAt).getTime() -
        new Date(first.latestMessageAt ?? first.createdAt).getTime(),
    );
  }

  return filteredClaims;
}

export async function normalizeClaimWithContext(claim: ClaimSourceLike) {
  const claims = await normalizeClaimsWithContext([claim]);
  return claims[0];
}

export async function normalizeClaimsWithContext(claims: ClaimSourceLike[]) {
  const plainClaims = claims.map(toPlainClaimSource);
  const itemIds = Array.from(new Set(plainClaims.map((claim) => claim.itemId).filter(Boolean)));
  const participantEmails = Array.from(
    new Set(
      plainClaims
        .flatMap((claim) => [claim.ownerEmail, claim.finderEmail])
        .map((email) => email?.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const claimIds = Array.from(new Set(plainClaims.map((claim) => claim._id.toString())));
  const items = itemIds.length
    ? await LostItemModel.find({ _id: { $in: itemIds } })
        .select("type location image")
        .lean()
    : [];
  const participants = participantEmails.length
    ? await UserModel.find({ email: { $in: participantEmails } })
        .select("name email image")
        .lean()
    : [];
  const latestMessages = claimIds.length
    ? await MessageModel.find({ claimId: { $in: claimIds } })
        .select("claimId message createdAt")
        .sort({ createdAt: -1 })
        .lean()
    : [];
  const itemsById = new Map<string, { type: LostItemType; location?: string; image?: string }>(
    items.map((item) => [
      item._id.toString(),
      {
        type: item.type === "found" ? "found" : "lost",
        location: item.location,
        image: item.image,
      },
    ]),
  );
  const participantsByEmail = new Map(
    participants.map((participant) => [
      participant.email.trim().toLowerCase(),
      {
        name: participant.name,
        image: participant.image,
      },
    ]),
  );
  const latestMessagesByClaimId = new Map<
    string,
    { message?: string; createdAt?: Date | string }
  >();

  latestMessages.forEach((message) => {
    if (!latestMessagesByClaimId.has(message.claimId)) {
      latestMessagesByClaimId.set(message.claimId, {
        message: message.message,
        createdAt: message.createdAt,
      });
    }
  });

  return plainClaims
    .map((claim) => {
      const item = itemsById.get(claim.itemId);
      const owner = participantsByEmail.get(claim.ownerEmail.trim().toLowerCase());
      const finder = participantsByEmail.get(claim.finderEmail.trim().toLowerCase());
      const latestMessage = latestMessagesByClaimId.get(claim._id.toString());
      const workflowRequestType = getFallbackRequestType(item?.type) ?? claim.requestType;

      return normalizeClaim({
        ...claim,
        itemType: item?.type,
        itemLocation: item?.location,
        itemImage: item?.image,
        requestType: workflowRequestType,
        requesterName: owner?.name,
        requesterImage: owner?.image,
        ownerName: owner?.name,
        ownerImage: owner?.image,
        finderName: finder?.name,
        finderImage: finder?.image,
        latestMessage: latestMessage?.message,
        latestMessageAt: latestMessage?.createdAt,
      });
    });
}

export async function getMessagesForClaim(claimId: string) {
  const messages = await MessageModel.find({ claimId }).sort({ createdAt: 1 }).lean();
  return messages.map(normalizeMessage);
}
