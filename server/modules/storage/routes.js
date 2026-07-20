const express = require('express');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('../../lib/storage');
const { R2_BUCKET_NAME } = require('../../config/env');

const router = express.Router();

// Not using authenticate middleware since assets like profile pictures
// and attachments are accessed via <img> and <audio> tags which might
// not send Authorization headers if they were relying on the previous 
// public cloudinary URLs. Wait, Cloudinary URLs were completely public.
// So this route should be public.
router.get('/*', async (req, res) => {
  // req.params[0] captures everything after /api/v1/storage/
  const key = req.params[0];
  
  if (!s3Client || !R2_BUCKET_NAME) {
    return res.status(503).json({ error: 'Storage is not configured' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    // Forward the content type and length
    if (response.ContentType) res.set('Content-Type', response.ContentType);
    if (response.ContentLength) res.set('Content-Length', response.ContentLength);
    if (response.CacheControl) {
      res.set('Cache-Control', response.CacheControl);
    } else {
      res.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    }

    // Pipe the S3 readable stream to the response
    response.Body.pipe(res);
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('S3 GetObject Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
