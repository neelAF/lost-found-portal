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
  requestType?: string;
  requesterName?: string;
  requesterImage?: string;
  ownerEmail: string;
  finderEmail: string;
  message?: string;
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
  requestType?: string;
  requesterName?: string;
  requesterImage?: string;
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
    itemType: item.itemType,
    itemLocation: item.itemLocation,
    requestType: normalizeClaimRequestType(item.requestType),
    requesterName: item.requesterName,
    requesterImage: item.requesterImage,
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
  if (options.requestType === "ownership") {
    return normalizedClaims.filter(
      (claim) => claim.requestType === "ownership" || !claim.requestType,
    );
  }

  if (options.requestType === "finder-response") {
    return normalizedClaims.filter((claim) => claim.requestType === "finder-response");
  }

  return normalizedClaims;
}

export async function normalizeClaimWithContext(claim: ClaimSourceLike) {
  const claims = await normalizeClaimsWithContext([claim]);
  return claims[0];
}

export async function normalizeClaimsWithContext(claims: ClaimSourceLike[]) {
  const plainClaims = claims.map(toPlainClaimSource);
  const itemIds = Array.from(new Set(plainClaims.map((claim) => claim.itemId).filter(Boolean)));
  const requesterEmails = Array.from(
    new Set(plainClaims.map((claim) => claim.ownerEmail?.trim().toLowerCase()).filter(Boolean)),
  );
  const items = itemIds.length
    ? await LostItemModel.find({ _id: { $in: itemIds } })
        .select("type location")
        .lean()
    : [];
  const requesters = requesterEmails.length
    ? await UserModel.find({ email: { $in: requesterEmails } })
        .select("name email image")
        .lean()
    : [];
  const itemsById = new Map<string, { type: LostItemType; location?: string }>(
    items.map((item) => [
      item._id.toString(),
      {
        type: item.type === "found" ? "found" : "lost",
        location: item.location,
      },
    ]),
  );
  const requestersByEmail = new Map(
    requesters.map((requester) => [
      requester.email.trim().toLowerCase(),
      {
        name: requester.name,
        image: requester.image,
      },
    ]),
  );

  return plainClaims
    .map((claim) => {
      const item = itemsById.get(claim.itemId);
      const requester = requestersByEmail.get(claim.ownerEmail.trim().toLowerCase());

      return normalizeClaim({
        ...claim,
        itemType: item?.type,
        itemLocation: item?.location,
        requestType: claim.requestType ?? getFallbackRequestType(item?.type),
        requesterName: requester?.name,
        requesterImage: requester?.image,
      });
    });
}

export async function getMessagesForClaim(claimId: string) {
  const messages = await MessageModel.find({ claimId }).sort({ createdAt: 1 }).lean();
  return messages.map(normalizeMessage);
}
