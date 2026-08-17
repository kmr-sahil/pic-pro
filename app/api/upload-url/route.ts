import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPresignedUploadUrl } from "@/lib/s3";

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { fileName, fileType, size } = await req.json();
  if (!fileName || !fileType) {
    return NextResponse.json(
      { error: "Missing file name or type" },
      { status: 400 }
    );
  }

  if (!/^(image|video)\//.test(fileType)) {
    return NextResponse.json(
      { error: "Only images and videos can be uploaded" },
      { status: 415 }
    );
  }

  if (typeof size === "number" && size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 2 GB" }, { status: 413 });
  }

  const sanitized = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const fileKey = `${session.user.id}/${Date.now()}-${crypto
    .randomUUID()
    .slice(0, 8)}-${sanitized}`;

  const uploadUrl = await createPresignedUploadUrl(fileKey, fileType);

  return NextResponse.json({ uploadUrl, fileKey });
}
