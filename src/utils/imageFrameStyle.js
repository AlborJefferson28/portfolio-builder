export function getImageFrameStyle(position, zoom) {
  const x = (position && position.x) ?? 50;
  const y = (position && position.y) ?? 50;
  const z = zoom || 1;
  const tx = (50 - x) * (z - 1);
  const ty = (50 - y) * (z - 1);
  return { transform: `translate(${tx}%, ${ty}%) scale(${z})` };
}
