// Run-length encoding for byte streams (PackBits-like).
// Each token is a count byte followed by data:
//   count in [1..128]    => literal: count bytes follow as-is
//   count in [129..255]  => run:     (257 - count) repetitions of the next byte (2..128 reps)
//   count == 0           => no-op terminator (skipped on decode)

export function rleEncode(input: Uint8Array): Uint8Array {
  if (!(input instanceof Uint8Array)) throw new TypeError('input must be a Uint8Array');
  const out: number[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    // Try to extend a run
    let runEnd = i + 1;
    while (runEnd < n && runEnd - i < 128 && input[runEnd] === input[i]) runEnd++;
    const runLen = runEnd - i;
    if (runLen >= 3) {
      out.push(257 - runLen);
      out.push(input[i]);
      i = runEnd;
      continue;
    }
    // Otherwise build a literal up to 128 bytes; stop early if we see a run of 3.
    const litStart = i;
    let j = i;
    while (j < n && j - litStart < 128) {
      // Look ahead 3 for run
      if (
        j + 2 < n &&
        input[j] === input[j + 1] &&
        input[j + 1] === input[j + 2]
      ) {
        break;
      }
      j++;
    }
    const litLen = j - litStart;
    out.push(litLen);
    for (let k = litStart; k < j; k++) out.push(input[k]);
    i = j;
  }
  return Uint8Array.from(out);
}

export function rleDecode(input: Uint8Array): Uint8Array {
  if (!(input instanceof Uint8Array)) throw new TypeError('input must be a Uint8Array');
  const out: number[] = [];
  let i = 0;
  while (i < input.length) {
    const tok = input[i++];
    if (tok === 0) continue;
    if (tok <= 128) {
      if (i + tok > input.length) throw new Error('truncated literal');
      for (let k = 0; k < tok; k++) out.push(input[i + k]);
      i += tok;
    } else {
      const reps = 257 - tok;
      if (i >= input.length) throw new Error('truncated run');
      const b = input[i++];
      for (let k = 0; k < reps; k++) out.push(b);
    }
  }
  return Uint8Array.from(out);
}
