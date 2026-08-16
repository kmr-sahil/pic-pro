import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicUrl } from "@/lib/s3";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await db.file.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const filesWithUrls = files.map((file) => ({
    ...file,
    url: getPublicUrl(file.storageKey),
  }));

  return NextResponse.json(filesWithUrls);
}
