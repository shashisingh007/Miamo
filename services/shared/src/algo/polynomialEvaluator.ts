export function evaluatePolynomial(coefficients: number[], x: number): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = result * x + coefficients[i];
  }
  return result;
}

export function differentiatePolynomial(coefficients: number[]): number[] {
  if (coefficients.length <= 1) return [];
  const out: number[] = [];
  for (let i = 1; i < coefficients.length; i++) out.push(coefficients[i] * i);
  return out;
}

export function integratePolynomial(coefficients: number[], constant: number = 0): number[] {
  const out: number[] = [constant];
  for (let i = 0; i < coefficients.length; i++) out.push(coefficients[i] / (i + 1));
  return out;
}

export function addPolynomials(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const out = new Array<number>(len).fill(0);
  for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  return out;
}

export function multiplyPolynomials(a: number[], b: number[]): number[] {
  if (a.length === 0 || b.length === 0) return [];
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}
