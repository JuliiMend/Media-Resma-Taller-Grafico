const key = (userId: number) => `media-resma:foto:${userId}`;

export function getLocalPhoto(userId: number): string | null {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

export function setLocalPhoto(userId: number, dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(key(userId), dataUrl);
    else localStorage.removeItem(key(userId));
  } catch {
    // Storage full or unavailable: the photo simply won't be cached locally.
  }
}

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export function resizeImage(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo procesar la imagen"));
        return;
      }
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("El archivo no es una imagen válida"));
    };
    img.src = url;
  });
}
