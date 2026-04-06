import { model, models, Schema, type InferSchemaType } from "mongoose";

const claimSchema = new Schema(
  {
    itemId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    itemTitle: {
      type: String,
      required: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    finderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      trim: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export type ClaimDocument = InferSchemaType<typeof claimSchema> & {
  _id: string;
  createdAt: Date;
};

export const ClaimModel = models.Claim || model("Claim", claimSchema);
