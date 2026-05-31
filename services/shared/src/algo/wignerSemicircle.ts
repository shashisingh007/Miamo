export interface WignerSemicircle {
  R: number;
  pdf(x: number): number;
  cdf(x: number): number;
  mean(): number;
  variance(): number;
}

export function wignerSemicircle(R: number): WignerSemicircle {
  if (!Number.isFinite(R) || R <= 0) throw new Error('R must be positive finite');
  const R2 = R * R;
  return {
    R,
    pdf(x: number): number {
      if (!Number.isFinite(x)) throw new Error('x must be finite');
      if (x <= -R || x >= R) return 0;
      return (2 / (Math.PI * R2)) * Math.sqrt(R2 - x * x);
    },
    cdf(x: number): number {
      if (!Number.isFinite(x)) throw new Error('x must be finite');
      if (x <= -R) return 0;
      if (x >= R) return 1;
      return 0.5 + (x * Math.sqrt(R2 - x * x)) / (Math.PI * R2) + Math.asin(x / R) / Math.PI;
    },
    mean(): number {
      return 0;
    },
    variance(): number {
      return R2 / 4;
    },
  };
}
