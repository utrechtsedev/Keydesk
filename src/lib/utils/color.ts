export function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const darken = (value: number) => Math.max(0, Math.floor(value * (1 - percent / 100)));

  const newR = darken(r).toString(16).padStart(2, '0');
  const newG = darken(g).toString(16).padStart(2, '0');
  const newB = darken(b).toString(16).padStart(2, '0');

  return `#${newR}${newG}${newB}`;
}
