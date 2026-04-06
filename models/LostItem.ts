import { model, models, Schema, type InferSchemaType } from "mongoose";

const lostItemSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["lost", "found"],
      default: "lost",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
      index: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export type LostItemDocument = InferSchemaType<typeof lostItemSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const LostItemModel =
  models.LostItem || model("LostItem", lostItemSchema);
