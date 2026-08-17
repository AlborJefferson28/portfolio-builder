function getFunctionsUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/track-event`;
}

export function getOrCreateSessionId(portfolioId) {
  const key = `pb-session-${portfolioId}`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function getDeviceType() {
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export function trackEvent(portfolioId, eventType, extra = {}) {
  const payload = {
    portfolio_id: portfolioId,
    event_type: eventType,
    session_id: getOrCreateSessionId(portfolioId),
    referrer: document.referrer || null,
    ...extra,
  };
  const url = getFunctionsUrl();
  const body = JSON.stringify(payload);
  if (eventType === 'session_end' && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    return;
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}
