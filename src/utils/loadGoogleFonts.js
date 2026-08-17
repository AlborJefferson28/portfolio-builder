const LINK_ID = 'pf-google-fonts';

export function ensureGoogleFonts(families) {
  const unique = Array.from(new Set(families)).filter(Boolean);
  if (unique.length === 0) return;
  const href = `https://fonts.googleapis.com/css2?${unique
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join('&')}&display=swap`;
  let link = document.getElementById(LINK_ID);
  if (!link) {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}
