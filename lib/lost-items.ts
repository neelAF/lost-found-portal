import { connectToDatabase, isDatabaseConfigured } from "@/lib/mongodb";
import { LostItemModel } from "@/models/LostItem";
import type { LostItem, LostItemStatus, LostItemType } from "@/lib/lost-item-shared";

type LostItemInput = {
  type?: LostItemType;
  title: string;
  description: string;
  location: string;
  contactNumber: string;
  userEmail?: string;
  image?: string;
};

type GetLostItemsOptions = {
  search?: string;
  type?: LostItemType;
  status?: LostItemStatus;
  includeContactNumber?: boolean;
};

type LostItemSource = {
  _id: { toString(): string } | string;
  type?: string;
  status?: string;
  title: string;
  description: string;
  location: string;
  contactNumber?: string;
  userEmail?: string;
  image?: string;
  createdAt: Date | string;
};

export function normalizeLostItem(
  item: LostItemSource,
  options: { includeContactNumber?: boolean } = {},
): LostItem {
  return {
    id: item._id.toString(),
    type: item.type === "found" ? "found" : "lost",
    status: item.status === "resolved" ? "resolved" : "active",
    title: item.title,
    description: item.description,
    location: item.location,
    contactNumber: options.includeContactNumber ? item.contactNumber?.trim() ?? "" : undefined,
    userEmail: item.userEmail?.trim().toLowerCase() ?? "",
    image: item.image?.trim() ?? "",
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getLostItems(options: GetLostItemsOptions = {}): Promise<LostItem[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  await connectToDatabase();

  const search = options.search?.trim() ?? "";
  const conditions: Array<Record<string, unknown>> = [];

  if (search) {
    conditions.push({
      $or: [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { location: { $regex: escapeRegex(search), $options: "i" } },
      ],
    });
  }

  if (options.type) {
    conditions.push(
      options.type === "lost"
        ? {
            $or: [{ type: "lost" }, { type: { $exists: false } }, { type: null }],
          }
        : { type: "found" },
    );
  }

  if (options.status) {
    conditions.push({ status: options.status });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  const items = await LostItemModel.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return items.map((item) =>
    normalizeLostItem(item, { includeContactNumber: options.includeContactNumber }),
  );
}

export async function addLostItem(input: LostItemInput): Promise<LostItem> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured.");
  }

  await connectToDatabase();

  const type = input.type === "found" ? "found" : "lost";

  const item = await LostItemModel.create({
    type,
    status: "active",
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    contactNumber: input.contactNumber.trim(),
    userEmail: input.userEmail?.trim().toLowerCase() ?? "",
    image: input.image?.trim() ?? "",
  });

  return normalizeLostItem(item, { includeContactNumber: true });
}

export async function resolveLostItem(id: string): Promise<LostItem | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured.");
  }

  await connectToDatabase();

  const item = await LostItemModel.findByIdAndUpdate(
    id,
    { status: "resolved" },
    { new: true, runValidators: true },
  ).lean();

  if (!item) {
    return null;
  }

  return normalizeLostItem(item, { includeContactNumber: true });
}

export function buildLostItemQuery(options: {
  type?: string | null;
  status?: string | null;
  search?: string | null;
}) {
  const search = options.search?.trim() ?? "";
  const requestedType =
    options.type === "found" ? "found" : options.type === "lost" ? "lost" : undefined;
  const requestedStatus =
    options.status === "resolved"
      ? "resolved"
      : options.status === "active"
        ? "active"
        : undefined;

  let type: LostItemType | undefined;
  let status: LostItemStatus | undefined;

  if (requestedStatus === "resolved") {
    status = "resolved";
  } else if (requestedType) {
    type = requestedType;
    status = "active";
  } else if (requestedStatus === "active") {
    status = "active";
  }

  return {
    search,
    type,
    status,
  };
}
