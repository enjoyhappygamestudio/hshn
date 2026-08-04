import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from '../config';

// Bucket R2: media = ảnh + video, documents = tài liệu, backups = bản sao lưu
export type BucketKind = 'media' | 'documents' | 'backups';

let s3: S3Client | null = null;

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3;
}

export function bucketName(kind: BucketKind): string {
  return config.r2.buckets[kind];
}

const localUploadsDir = path.join(__dirname, '../../uploads');

function localFilePath(key: string): string {
  return path.join(localUploadsDir, key);
}

export function safeFilename(name: string): string {
  const ext = path.extname(name || '').replace(/[^\w.]/g, '').toLowerCase().slice(0, 10);
  const base = path.basename(name || 'file', ext).replace(/[^\w-]+/g, '-').slice(0, 60) || 'file';
  return `${base}${ext}`;
}

export function publicUrl(key: string): string {
  const base = config.r2.publicUrl.replace(/\/$/, '');
  return `${base}/${key}`;
}

export async function uploadBuffer(opts: { bucket: BucketKind; key: string; body: Buffer; contentType: string }): Promise<string> {
  const { bucket, key, body, contentType } = opts;
  if (config.r2.enabled) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: bucketName(bucket),
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return publicUrl(key);
  }
  const filePath = localFilePath(key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body);
  return `/uploads/${key}`;
}

export async function deleteObject(bucket: BucketKind, key: string): Promise<void> {
  if (!key) return;
  if (config.r2.enabled) {
    try {
      await getS3().send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
    } catch (_) {
      // best effort
    }
    return;
  }
  try {
    fs.unlinkSync(localFilePath(key));
  } catch (_) {
    // best effort
  }
}

export function keyFromUrl(url: string): string | null {
  if (!url) return null;
  if (config.r2.enabled && config.r2.publicUrl && url.startsWith(config.r2.publicUrl)) {
    return url.slice(config.r2.publicUrl.replace(/\/$/, '').length + 1);
  }
  if (url.startsWith('/uploads/')) return url.slice('/uploads/'.length);
  return null;
}

// ===== Dùng cho cơ chế backup (hsb-backups) =====

export async function listObjects(bucket: BucketKind, prefix: string): Promise<{ Key: string; Size?: number }[]> {
  if (!config.r2.enabled) return [];
  const out: { Key: string; Size?: number }[] = [];
  let token: string | undefined;
  do {
    const res = await getS3().send(
      new ListObjectsV2Command({
        Bucket: bucketName(bucket),
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const obj of res.Contents || []) {
      if (obj.Key) out.push({ Key: obj.Key, Size: obj.Size });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

export async function copyObject(opts: { fromBucket: BucketKind; toBucket: BucketKind; key: string; newKey?: string }): Promise<void> {
  const { fromBucket, toBucket, key, newKey } = opts;
  if (!config.r2.enabled) return;
  await getS3().send(
    new CopyObjectCommand({
      Bucket: bucketName(toBucket),
      Key: newKey || key,
      CopySource: `${bucketName(fromBucket)}/${encodeURIComponent(key)}`,
    }),
  );
}

export async function getObject(bucket: BucketKind, key: string): Promise<Buffer> {
  if (config.r2.enabled) {
    const res = await getS3().send(new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  return fs.readFileSync(localFilePath(key));
}
