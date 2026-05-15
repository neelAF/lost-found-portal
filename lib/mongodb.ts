import "server-only";

import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const globalCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalThis.mongooseCache = globalCache;

export function isDatabaseConfigured() {
  return Boolean(getMongoUri());
}

function getMongoUri() {
  return process.env.MONGODB_URI?.trim();
}

function getConnectionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown MongoDB connection error.";

  if (
    message.includes("Could not connect to any servers in your MongoDB Atlas cluster") ||
    message.includes("IP") ||
    message.includes("whitelist")
  ) {
    return [
      "Unable to connect to MongoDB Atlas.",
      "Make sure your current IP address is allowed in Atlas Network Access and that the database user credentials are correct.",
    ].join(" ");
  }

  return `Unable to connect to MongoDB: ${message}`;
}

export async function connectToDatabase() {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    throw new Error("Please define the MONGODB_URI environment variable.");
  }

  if (globalCache.conn && mongoose.connection.readyState === 1) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    globalCache.conn = await globalCache.promise;
    return globalCache.conn;
  } catch (error) {
    globalCache.conn = null;
    globalCache.promise = null;
    throw new Error(getConnectionErrorMessage(error));
  }
}
