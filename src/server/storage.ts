import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

// Storage Directory for Local Fallback
const UPLOADS_DIR = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const CONFIG_FILE = path.resolve(process.cwd(), 'data/r2_config.json');

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}

/**
 * Get R2 configuration from file store or environment variables
 */
export function getR2Config(): R2Config {
  let fileConfig: Partial<R2Config> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (e) {
      console.warn('Failed reading r2_config.json:', e);
    }
  }

  return {
    accountId: fileConfig.accountId || process.env.R2_ACCOUNT_ID || process.env.CF_R2_ACCOUNT_ID || '',
    accessKeyId: fileConfig.accessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.CF_R2_ACCESS_KEY_ID || '',
    secretAccessKey: fileConfig.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || process.env.CF_R2_SECRET_ACCESS_KEY || '',
    bucketName: fileConfig.bucketName || process.env.R2_BUCKET_NAME || process.env.CF_R2_BUCKET_NAME || 'convee-carepulse-assets',
    publicDomain: fileConfig.publicDomain || process.env.R2_PUBLIC_URL || process.env.CF_R2_PUBLIC_URL || '',
  };
}

/**
 * Save R2 configuration to disk
 */
export function saveR2Config(config: Partial<R2Config>): R2Config {
  const current = getR2Config();
  const updated: R2Config = {
    accountId: config.accountId !== undefined ? config.accountId.trim() : current.accountId,
    accessKeyId: config.accessKeyId !== undefined ? config.accessKeyId.trim() : current.accessKeyId,
    secretAccessKey: config.secretAccessKey !== undefined ? config.secretAccessKey.trim() : current.secretAccessKey,
    bucketName: config.bucketName !== undefined ? config.bucketName.trim() : current.bucketName,
    publicDomain: config.publicDomain !== undefined ? config.publicDomain.trim() : current.publicDomain,
  };

  const dataDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

/**
 * Check if Cloudflare R2 is configured and active
 */
export function isR2Configured(config?: R2Config): boolean {
  const cfg = config || getR2Config();
  return Boolean(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName);
}

/**
 * Create S3Client for Cloudflare R2
 */
function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

/**
 * Test R2 connection by performing a HeadBucket or list check
 */
export async function testR2Connection(customConfig?: R2Config): Promise<{ success: boolean; message: string }> {
  const config = customConfig || getR2Config();
  if (!isR2Configured(config)) {
    return {
      success: false,
      message: 'Cloudflare R2 belum dikonfigurasi. Sila masukkan Account ID, Access Key ID, Secret Access Key, dan Bucket Name.',
    };
  }

  try {
    const client = createR2Client(config);
    await client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
    return {
      success: true,
      message: `Berjaya berhubung dengan Cloudflare R2 Bucket: "${config.bucketName}".`,
    };
  } catch (err: any) {
    console.error('Cloudflare R2 Connection Test Failed:', err);
    return {
      success: false,
      message: `Gagal menyambung ke Cloudflare R2: ${err.message || 'Ralat pengesahan atau bucket tidak wujud.'}`,
    };
  }
}

export interface UploadResult {
  url: string;
  storageType: 'cloudflare_r2' | 'local_fallback';
  key: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Main Image Upload Function (Uploads to Cloudflare R2 or Local Fallback)
 */
export async function uploadImageFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  customR2Config?: R2Config
): Promise<UploadResult> {
  const config = customR2Config || getR2Config();
  const ext = path.extname(originalFilename) || (mimeType.includes('png') ? '.png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.webp');
  const fileKey = `uploads/convee_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

  // 1. If Cloudflare R2 is configured, upload to Cloudflare R2 Bucket
  if (isR2Configured(config)) {
    try {
      const client = createR2Client(config);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: {
            'app-name': 'Convee CarePulse',
            'uploaded-at': new Date().toISOString(),
          },
        })
      );

      // Construct Public R2 URL
      let publicUrl = '';
      if (config.publicDomain) {
        const domainClean = config.publicDomain.endsWith('/') ? config.publicDomain.slice(0, -1) : config.publicDomain;
        publicUrl = `${domainClean}/${fileKey}`;
      } else {
        // Default Cloudflare R2 dev domain / endpoint
        publicUrl = `https://${config.bucketName}.${config.accountId}.r2.dev/${fileKey}`;
      }

      console.log(`[R2 Storage] File uploaded successfully to R2 bucket "${config.bucketName}": ${publicUrl}`);

      return {
        url: publicUrl,
        storageType: 'cloudflare_r2',
        key: fileKey,
        sizeBytes: fileBuffer.length,
        mimeType,
      };
    } catch (err: any) {
      console.warn('[R2 Storage] Failed uploading to Cloudflare R2, using local fallback:', err.message);
    }
  }

  // 2. Local File Fallback if R2 credentials are missing or call fails in dev
  const localFileName = path.basename(fileKey);
  const localFilePath = path.join(UPLOADS_DIR, localFileName);
  fs.writeFileSync(localFilePath, fileBuffer);

  const localUrl = `/uploads/${localFileName}`;
  console.log(`[Local Storage] File saved locally to: ${localUrl}`);

  return {
    url: localUrl,
    storageType: 'local_fallback',
    key: fileKey,
    sizeBytes: fileBuffer.length,
    mimeType,
  };
}

/**
 * Upload Base64 Image string to R2 / Local
 */
export async function uploadBase64Image(base64Data: string, prefix = 'img'): Promise<UploadResult> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Format string Base64 imej tidak sah.');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const ext = mimeType.includes('png') ? '.png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.webp';
  const filename = `${prefix}_${Date.now()}${ext}`;

  return uploadImageFile(buffer, filename, mimeType);
}
