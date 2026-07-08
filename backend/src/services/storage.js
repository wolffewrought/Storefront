import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import config from '../config.js';

// Cloudflare R2 is S3-compatible. Two buckets:
//   - filesBucket  (PRIVATE): sellable STLs/zips. Only reachable via short-lived presigned URLs.
//   - imagesBucket (PUBLIC):  product images, served directly via R2 public development URL
//     or a custom domain.

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

export const isStorageConfigured = () =>
  Boolean(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey);

const safeName = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

// Random, unguessable object key
export const makeKey = (fileName) =>
  `${crypto.randomBytes(16).toString('hex')}/${safeName(fileName)}`;

// Presigned PUT — browser uploads directly to R2 (no proxying through Railway)
export async function presignUpload({ key, contentType, kind }) {
  const bucket = kind === 'image' ? config.r2.imagesBucket : config.r2.filesBucket;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });
  const uploadUrl = await getSignedUrl(r2, cmd, { expiresIn: 600 }); // 10 min to upload
  return { uploadUrl, key };
}

// Presigned GET for private files — this is what customers receive
export async function presignDownload(key, fileName) {
  const cmd = new GetObjectCommand({
    Bucket: config.r2.filesBucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${safeName(fileName || key.split('/').pop())}"`,
  });
  return getSignedUrl(r2, cmd, { expiresIn: config.r2.downloadExpirySeconds });
}

// Public URL for images
export const publicImageUrl = (key) =>
  `${config.r2.imagesPublicUrl.replace(/\/$/, '')}/${key}`;
