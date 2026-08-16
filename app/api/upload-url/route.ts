import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPresignedUploadUrl } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, fileType } = await req.json();
  if (!fileName || !fileType) {
    return NextResponse.json({ error: "Missing fileName or fileType" }, { status: 400 });
  }

  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `${session.user.id}/${timestamp}-${sanitized}`;

  const uploadUrl = await createPresignedUploadUrl(fileKey, fileType);

  return NextResponse.json({ uploadUrl, fileKey });
}
