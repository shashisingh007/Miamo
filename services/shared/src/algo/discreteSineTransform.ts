// Discrete Sine Transform (DST-II) — direct O(N^2) formula.
// X[k] = sum_{n=0}^{N-1} x[n] * sin( pi/N * (n + 1/2) * (k+1) ),  k=0..N-1.
// Inverse (DST-III) is also exposed.

export function discreteSineTransform(x: number[]): number[] {
  const N = x.length;
  if (N === 0) throw new Error('discreteSineTransform: empty');
  const X = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let n = 0; n < N; n++) {
      s += x[n] * Math.sin((Math.PI / N) * (n + 0.5) * (k + 1));
    }
    X[k] = s;
  }
  return X;
}

// Inverse DST-II (DST-III scaled): given X = DST-II(x),
// x[n] = (2/N) * sum_{k=0}^{N-1} X[k] * sin(pi/N * (n+1/2) * (k+1))
// — but for k=N-1 the standard convention treats specially. Here we use the symmetric form
// without scaling correction, returning an unnormalized inverse.
export function discreteSineTransformInverse(X: number[]): number[] {
  const N = X.length;
  if (N === 0) throw new Error('discreteSineTransformInverse: empty');
  const x = new Array(N).fill(0);
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (let k = 0; k < N - 1; k++) {
      s += X[k] * Math.sin((Math.PI / N) * (n + 0.5) * (k + 1));
    }
    // Highest-frequency term k=N-1 has half the weight (orthogonality boundary)
    const last = X[N - 1] * Math.sin((Math.PI / N) * (n + 0.5) * N);
    x[n] = (2 / N) * s + (1 / N) * last;
  }
  return x;
}
