export type LostItemType = "lost" | "found";
export type LostItemStatus = "active" | "resolved";
export type LostItemFilter = "all" | LostItemType | "resolved";

export type LostItem = {
  id: string;
  type: LostItemType;
  status: LostItemStatus;
  title: string;
  description: string;
  location: string;
  contactNumber?: string;
  userEmail: string;
  image: string;
  createdAt: string;
};

export function isItemOwner(itemUserEmail?: string, userEmail?: string | null) {
  return Boolean(
    itemUserEmail &&
      userEmail &&
      itemUserEmail.trim().toLowerCase() === userEmail.trim().toLowerCase(),
  );
}
