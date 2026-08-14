import { mediaRepository } from '../db/mediaRepository';

export async function applyProfileImageChange(ownerType, ownerId, change, existingImageId = null) {
  if (!change || change.action === 'none') {
    return existingImageId ?? null;
  }
  if (change.action === 'remove') {
    if (existingImageId) {
      await mediaRepository.deleteById(existingImageId);
    }
    return null;
  }
  if (change.action === 'upload') {
    return mediaRepository.saveForOwner(ownerType, ownerId, change.blob, change.mimeType, existingImageId);
  }
  return existingImageId ?? null;
}
