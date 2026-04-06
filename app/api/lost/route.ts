import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { addLostItem, buildLostItemQuery, getLostItems } from "@/lib/lost-items";
import { authOptions } from "@/lib/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    const query = buildLostItemQuery({
      search: searchParams.get("search"),
      type: searchParams.get("type"),
      status: searchParams.get("status"),
    });

    const items = await getLostItems({
      ...query,
      includeContactNumber: Boolean(session?.user?.email),
    });

    return NextResponse.json(items);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch items right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get("title")?.toString().trim() ?? "";
    const description = formData.get("description")?.toString().trim() ?? "";
    const location = formData.get("location")?.toString().trim() ?? "";
    const contactNumber = formData.get("contactNumber")?.toString().trim() ?? "";
    const type = formData.get("type")?.toString() === "found" ? "found" : "lost";
    const imageFile = formData.get("image");

    if (!title || !description || !location || !contactNumber) {
      return NextResponse.json(
        { error: "Title, description, location, and contact number are required." },
        { status: 400 },
      );
    }

    let image = "";

    if (imageFile instanceof File && imageFile.size > 0) {
      image = await uploadImageToCloudinary(imageFile);
    }

    const item = await addLostItem({
      type,
      title,
      description,
      location,
      contactNumber,
      userEmail: session.user.email,
      image,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to store the lost item right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
