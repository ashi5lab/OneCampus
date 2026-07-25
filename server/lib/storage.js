const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = require('../config/env');

const isConfigured = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

let s3Client = null;

if (isConfigured) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    }
  });
}

// Uploads a buffer to Cloudflare R2.
// Replaces the previous Cloudinary uploadBuffer function.
async function uploadBuffer(buffer, { folder, publicId, resourceType, transformation, mimetype }) {
  if (!isConfigured) throw Object.assign(new Error('File attachments are not configured for this deployment'), { status: 503 });

  // Generate a random key if publicId is not provided
  const id = publicId || Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8);
  const key = `${folder}/${id}`;
  
  // Use a generic octet-stream if mimetype isn't provided, 
  // though controllers should ideally provide it.
  const ContentType = mimetype || (resourceType === 'video' ? 'audio/webm' : 'application/octet-stream');

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType,
  });

  await s3Client.send(command);

  // Return an object that mirrors the Cloudinary response structure
  // that the rest of the application expects.
  const baseUrl = (R2_PUBLIC_URL || '').replace(/\/$/, '');
  
  // We'll create a proxy route in our app to serve these files (e.g. GET /api/v1/storage/*)
  const secure_url = baseUrl ? `${baseUrl}/api/v1/storage/${key}` : `/api/v1/storage/${key}`;

  return {
    secure_url,
    public_id: key
  };
}

async function deleteFile(fileUrlOrKey) {
  if (!isConfigured || !fileUrlOrKey) return;
  try {
    // Extract key if a full URL is provided (e.g. /api/v1/storage/onecampus/...)
    let key = fileUrlOrKey;
    if (key.includes('/api/v1/storage/')) {
      key = key.split('/api/v1/storage/')[1];
    }
    
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
  } catch (err) {
    console.error('Failed to delete file from R2:', err);
  }
}

module.exports = { isConfigured, uploadBuffer, deleteFile, s3Client };
