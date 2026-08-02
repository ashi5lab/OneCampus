import { useRef, useState } from 'react';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import { Avatar } from '../../../components/Avatar';
import { useUploadProfilePicture, useRemoveProfilePicture } from '../hooks/useProfilePicture';

// heic/heif included so iOS actually offers/sends the original photo
// instead of transcoding or blocking it at the picker — the backend
// decodes HEIC/HEIF via Cloudinary and always stores a browser-compatible
// format regardless (see server/modules/profile/controller.js).
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';

// Helper to resize image client-side to be under a certain size (in KB)
async function resizeImageToLimit(file, limitKB) {
  if (!file.type.startsWith('image/')) return file; // Skip non-images (e.g. heic might bypass this if browser doesn't support drawing it to canvas natively)

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = img.width;
      let height = img.height;
      const MAX_DIMENSION = 800; // max width/height

      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = Math.round(height * (MAX_DIMENSION / width));
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = Math.round(width * (MAX_DIMENSION / height));
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9;
      const maxBytes = limitKB * 1024;

      const compress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas compress failed'));
          if (blob.size <= maxBytes || quality <= 0.1) {
            // Give it a fresh File object
            const ext = file.name.split('.').pop();
            const newName = file.name.replace(`.${ext}`, '.jpg');
            resolve(new File([blob], newName, { type: 'image/jpeg' }));
          } else {
            quality -= 0.1;
            compress();
          }
        }, 'image/jpeg', quality);
      };
      
      compress();
    };

    reader.readAsDataURL(file);
  });
}

// Only rendered on a profile page when the viewer IS that profile (see
// LearnerProfilePage/InstructorProfilePage) OR when a Teacher/Admin is editing a student
export function ProfilePictureUploader({ name, pictureUrl, invalidateKey, customUpload, customRemove, readOnly = false, containerClassName = "w-full h-full" }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const defaultUpload = useUploadProfilePicture(invalidateKey);
  const defaultRemove = useRemoveProfilePicture(invalidateKey);

  const upload = customUpload || defaultUpload;
  const remove = customRemove || defaultRemove;

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsMenuOpen(false);
    
    let fileToUpload = file;
    try {
      fileToUpload = await resizeImageToLimit(file, 50); // Target < 50KB
    } catch (err) {
      console.error('Image resize failed, uploading original', err);
    }

    upload.mutate(fileToUpload, {
      onError: (err) => setError(err.message),
      onSettled: () => {
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  }

  return (
    <>
      <div className={`relative flex flex-col items-center justify-center ${containerClassName}`}>
        <div 
          className={`relative w-full h-full rounded-full overflow-hidden ${pictureUrl && !upload.isPending ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          onClick={() => { if (pictureUrl && !upload.isPending) setShowFullPhoto(true); }}
        >
          <Avatar name={name} src={pictureUrl} size={104} className="w-full h-full" />
          
          {upload.isPending && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-10 text-white">
              <Loader2 className="w-6 h-6 animate-spin mb-1" />
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="absolute md:-bottom-1 md:-left-2 -bottom-1 -right-2 z-10">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface shadow-md border border-border text-accent hover:bg-surface-muted transition-colors"
              title="Edit photo"
            >
              <Pencil className="w-4 h-4" fill="currentColor" strokeWidth={2} />
            </button>

            {isMenuOpen && (
              <div className="absolute top-10 md:left-0 right-0 w-32 bg-surface rounded-lg shadow-xl border border-border p-1 flex flex-col z-20">
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
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-surface-muted rounded disabled:opacity-50 text-left"
                >
                  <Pencil className="w-3.5 h-3.5 text-accent" />
                  {upload.isPending ? 'Uploading…' : 'Change'}
                </button>
                {pictureUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      remove.mutate();
                    }}
                    disabled={remove.isPending}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger hover:bg-danger-light rounded disabled:opacity-50 text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                )}
              </div>
            )}
            
            {isMenuOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
            )}
          </div>
        )}

        {error && <div className="absolute -bottom-10 whitespace-nowrap text-[10px] text-danger font-medium bg-danger-light px-2 py-1 rounded border border-danger z-10">{error}</div>}
      </div>

      {showFullPhoto && pictureUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setShowFullPhoto(false)}>
          <img src={pictureUrl} alt="Profile" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        </div>
      )}
    </>
  );
}
