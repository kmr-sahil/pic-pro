import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function createPresignedUploadUrl(
  key: string,
  fileType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
  });

  return getSignedUrl(s3, command, { expiresIn: 900 });
}

/** Best-effort cleanup — the DB row is the source of truth, so a failed
 *  object delete must never block removing the file from the library. */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  // DeleteObjects caps out at 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    try {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        })
      );
    } catch (err) {
      console.error("Failed to delete S3 objects", err);
    }
  }
}

export function getPublicUrl(key: string): string {
  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
