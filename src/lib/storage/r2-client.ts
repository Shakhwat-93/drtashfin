import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || "drtahsfin";

/**
 * Cloudflare R2 S3 Client instance
 */
export const r2Client = new S3Client({
  region: "auto",
  endpoint:
    process.env.R2_ENDPOINT ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined),
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Uploads an object directly to the Cloudflare R2 bucket
 */
export async function uploadToR2({
  key,
  body,
  contentType,
  metadata,
}: UploadOptions) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  return await r2Client.send(command);
}

/**
 * Retrieves an object from the Cloudflare R2 bucket
 */
export async function getFromR2(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await r2Client.send(command);
}

/**
 * Deletes an object from the Cloudflare R2 bucket
 */
export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await r2Client.send(command);
}

/**
 * Checks if an object exists in the Cloudflare R2 bucket
 */
export async function checkObjectExistsR2(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      err.name === "NotFound"
    ) {
      return false;
    }
    throw err;
  }
}

/**
 * Lists objects in the Cloudflare R2 bucket
 */
export async function listR2Objects(prefix?: string, maxKeys = 100) {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  return await r2Client.send(command);
}

/**
 * Generates a presigned URL for secure client-side direct upload
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType?: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generates a presigned URL for secure temporary download/viewing
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}
