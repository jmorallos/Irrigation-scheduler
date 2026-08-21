import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useProfileImage } from '../hooks/useProfileImage';

export default function PhotoPreview({ name, profileImageId, onClose }) {
  const { url, loading } = useProfileImage(profileImageId);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!profileImageId) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={name ? `Photo of ${name}` : 'Photo preview'}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close photo preview"
      />
      <div className="relative z-10 flex max-h-full max-w-full flex-col items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 sm:top-0 sm:right-0 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {loading && !url ? (
          <div className="px-8 py-16 text-sm text-white/80">Loading photo…</div>
        ) : url ? (
          <img
            src={url}
            alt={name || 'Valve photo'}
            className="max-h-[min(85vh,900px)] max-w-[min(92vw,900px)] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="px-8 py-16 text-sm text-white/80">Photo unavailable</div>
        )}
        {name && (
          <p className="text-sm font-medium text-white/90 text-center drop-shadow">{name}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
