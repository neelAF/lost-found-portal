import { model, models, Schema, type InferSchemaType } from "mongoose";

const messageSchema = new Schema(
  {
    claimId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    receiverEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: string;
  createdAt: Date;
};

export const MessageModel = models.Message || model("Message", messageSchema);
