import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import ProgramLogo from './ProgramLogo';
import { compressImageFile, formatFileSize } from '../utils/imageUtils';
import { useProfileImage } from '../hooks/useProfileImage';

export default function ProfileImagePicker({ name, profileImageId, onChange, label = 'Profile photo' }) {
  const fileRef = useRef(null);
  const { url: storedUrl } = useProfileImage(profileImageId);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [savedInfo, setSavedInfo] = useState(null);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = removed ? null : (previewUrl || storedUrl);
  const canRemove = Boolean(displayUrl || (profileImageId && !removed));

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    try {
      const { blob, mimeType, width, height } = await compressImageFile(file);
      setPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setSavedInfo({ width, height, size: blob.size });
      setRemoved(false);
      onChange({ action: 'upload', blob, mimeType });
    } catch (err) {
      setSavedInfo(null);
      setError(err.message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemove = () => {
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSavedInfo(null);
    setRemoved(true);
    onChange({ action: 'remove' });
  };

  return (
    <div>
      <span className="block text-sm font-medium text-black mb-2">{label}</span>
      <div className="flex items-center gap-4">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt=""
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-slate-200"
          />
        ) : (
          <ProgramLogo name={name || '?'} size="xl" />
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            Upload photo
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-black bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {savedInfo ? (
        <p className="mt-1.5 text-xs text-black">
          Saved at {savedInfo.width}×{savedInfo.height} · {formatFileSize(savedInfo.size)}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-black">JPEG or PNG, max 10 MB. Stored on this device only.</p>
      )}
    </div>
  );
}
