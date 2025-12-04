export function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (value: number) => {
    if (percent < 0) {
      // Lighten: move towards 255
      return Math.min(255, Math.floor(value + (255 - value) * (Math.abs(percent) / 100)));
    } else {
      // Darken: move towards 0
      return Math.max(0, Math.floor(value * (1 - percent / 100)));
    }
  };

  const newR = adjust(r).toString(16).padStart(2, '0');
  const newG = adjust(g).toString(16).padStart(2, '0');
  const newB = adjust(b).toString(16).padStart(2, '0');

  return `#${newR}${newG}${newB}`;
}
