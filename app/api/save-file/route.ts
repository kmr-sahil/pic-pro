import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, fileType, size, storageKey } = await req.json();
  if (!fileName || !fileType || !size || !storageKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const file = await db.file.create({
    data: {
      userId: session.user.id,
      fileName,
      fileType,
      size,
      storageKey,
    },
  });

  return NextResponse.json(file, { status: 201 });
}
