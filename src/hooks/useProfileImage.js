import { useState, useEffect } from 'react';
import { mediaRepository } from '../db/mediaRepository';

export function useProfileImage(profileImageId) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(profileImageId));

  useEffect(() => {
    if (!profileImageId) {
      setUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl = null;
    setLoading(true);

    mediaRepository.getById(profileImageId).then(record => {
      if (cancelled) return;
      if (record?.blob) {
        objectUrl = URL.createObjectURL(record.blob);
        setUrl(objectUrl);
      } else {
        setUrl(null);
      }
      setLoading(false);
    }).catch(() => {
      if (!cancelled) {
        setUrl(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profileImageId]);

  return { url, loading };
}
