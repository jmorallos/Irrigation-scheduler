const MAX_DIMENSION = 512;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const TARGET_BYTES = 200 * 1024;
const JPEG_QUALITIES = [0.82, 0.7, 0.6];

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      result => (result ? resolve(result) : reject(new Error('Could not compress this photo. Try a different image.'))),
      'image/jpeg',
      quality,
    );
  });
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function compressImageFile(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image must be 10 MB or smaller.');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Could not read this photo. Try a different image.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Could not compress this photo. Try a different image.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = null;
  for (const quality of JPEG_QUALITIES) {
    blob = await canvasToJpeg(canvas, quality);
    if (blob.size <= TARGET_BYTES) break;
  }

  if (!blob || blob.size > MAX_FILE_BYTES) {
    throw new Error('Could not shrink this photo enough. Try a different image.');
  }

  return { blob, mimeType: 'image/jpeg', width, height };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

