// Transparent HEIC/HEIF → JPEG conversion for browsers that can't decode HEIC.
// iPhones save photos as HEIC by default; Chrome/Firefox can't render or upload
// them as image/jpeg, so we decode them client-side via heic2any (lazy-loaded).
//
// Usage:
//   const safeFile = await convertHeicIfNeeded(file, { onProgress })
//   // upload `safeFile` as if it were a normal JPEG
//
// If the file isn't HEIC, returns the original File unchanged (no-op).

const HEIC_EXTS = ["heic", "heif"];
const HEIC_MIMES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];

const isHeic = (file) => {
  if (!file) return false;
  const name = (file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() : "";
  if (HEIC_EXTS.includes(ext)) return true;
  const mime = (file.type || "").toLowerCase();
  if (HEIC_MIMES.some((m) => mime === m)) return true;
  return false;
};

/**
 * Convert an HEIC/HEIF File/Blob to a JPEG File. No-op for other formats.
 * @param {File} file
 * @param {object} [opts]
 * @param {number} [opts.quality=0.9] JPEG quality 0..1
 * @returns {Promise<File>} a File you can hand to FormData / FileReader
 */
export async function convertHeicIfNeeded(file, opts = {}) {
  if (!isHeic(file)) return file;
  // Lazy-load — heic2any pulls in libheif (~600KB) so we only download it if needed
  const mod = await import("heic2any");
  const heic2any = mod.default || mod;
  const blob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: opts.quality ?? 0.9,
  });
  // heic2any can return a single Blob or an array (multi-image HEIC); take the first
  const out = Array.isArray(blob) ? blob[0] : blob;
  const baseName = (file.name || "photo.heic").replace(/\.(heic|heif)$/i, ".jpg");
  return new File([out], baseName, { type: "image/jpeg", lastModified: Date.now() });
}

export { isHeic };
