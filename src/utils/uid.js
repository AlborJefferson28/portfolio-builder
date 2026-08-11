let uidCounter = 0;

export function uid() {
  uidCounter += 1;
  return `id_${uidCounter}_${Math.random().toString(36).slice(2, 7)}`;
}
