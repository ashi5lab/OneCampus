import { useRef, useState } from 'react';
import { Avatar } from '../../../components/Avatar';
import { useUploadProfilePicture, useRemoveProfilePicture } from '../hooks/useProfilePicture';

// heic/heif included so iOS actually offers/sends the original photo
// instead of transcoding or blocking it at the picker — the backend
// decodes HEIC/HEIF via Cloudinary and always stores a browser-compatible
// format regardless (see server/modules/profile/controller.js).
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';

// Only rendered on a profile page when the viewer IS that profile (see
// LearnerProfilePage/InstructorProfilePage) — there's no "set someone
// else's picture" affordance in v1, matching the backend's self-only upload.
export function ProfilePictureUploader({ name, pictureUrl, invalidateKey }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const upload = useUploadProfilePicture(invalidateKey);
  const remove = useRemoveProfilePicture(invalidateKey);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    upload.mutate(file, {
      onError: (err) => setError(err.message),
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={pictureUrl} size={72} />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-700 disabled:opacity-60"
        >
          {upload.isPending ? 'Uploading…' : 'Change photo'}
        </button>
        {pictureUrl && (
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
            className="ml-2 text-xs font-semibold text-danger hover:opacity-80 disabled:opacity-60"
          >
            Remove
          </button>
        )}
        {error && <div className="mt-1 text-[11px] font-semibold text-danger">{error}</div>}
      </div>
    </div>
  );
}
