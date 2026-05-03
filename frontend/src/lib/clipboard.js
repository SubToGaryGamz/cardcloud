// Robust clipboard copy with legacy fallback for restricted contexts
// (headless, iframes, non-HTTPS, missing Permissions-Policy etc.)
export async function copyText(text) {
  if (!text) return false;
  // Modern API (most browsers, secure top-level contexts)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through to legacy */ }
  // Legacy fallback: hidden textarea + execCommand("copy")
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (_) {
    return false;
  }
}
