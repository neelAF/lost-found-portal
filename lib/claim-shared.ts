export type ClaimStatus = "pending" | "approved" | "rejected" | "completed";

export type Claim = {
  id: string;
  itemId: string;
  itemTitle: string;
  ownerEmail: string;
  finderEmail: string;
  message: string;
  status: ClaimStatus;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  claimId: string;
  senderEmail: string;
  receiverEmail: string;
  message: string;
  createdAt: string;
};

export function isClaimParticipant(claim: Pick<Claim, "ownerEmail" | "finderEmail">, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  return (
    claim.ownerEmail.trim().toLowerCase() === normalizedEmail ||
    claim.finderEmail.trim().toLowerCase() === normalizedEmail
  );
}

export function isClaimFinder(claim: Pick<Claim, "finderEmail">, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && claim.finderEmail.trim().toLowerCase() === normalizedEmail);
}

export function isClaimOwner(claim: Pick<Claim, "ownerEmail">, email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && claim.ownerEmail.trim().toLowerCase() === normalizedEmail);
}
