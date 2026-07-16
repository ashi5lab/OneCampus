const { v2: cloudinary } = require('cloudinary');
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config/env');

const isConfigured = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

if (isConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
}

// This Cloudinary account/cloud is shared across multiple unrelated apps —
// every caller must pass a `folder` starting with "onecampus/" (enforced by
// callers, not here) so uploads from this app stay identifiable and never
// collide with another project's assets in the same account.
// resourceType defaults to 'image' (profile pictures); audio uploads
// (voicemail recordings) must pass 'video' — that's Cloudinary's resource
// type for all audio/video media, there is no separate 'audio' type.
function uploadBuffer(buffer, { folder, publicId, resourceType = 'image' }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: true, resource_type: resourceType },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = { isConfigured, uploadBuffer };
