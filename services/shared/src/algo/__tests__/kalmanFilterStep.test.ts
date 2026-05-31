import { describe, it, expect } from 'vitest';
import { kalmanFilterStep } from '../kalmanFilterStep';

describe('kalmanFilterStep', () => {
  it('throws on empty x', () => {
    expect(() => kalmanFilterStep({
      x: [], P: [], F: [], Q: [], z: [], H: [], R: [],
    })).toThrow();
  });

  it('throws on P dim mismatch', () => {
    expect(() => kalmanFilterStep({
      x: [0, 0],
      P: [[1, 0]],
      F: [[1, 0], [0, 1]],
      Q: [[0, 0], [0, 0]],
      z: [0],
      H: [[1, 0]],
      R: [[1]],
    })).toThrow();
  });

  it('throws on H dim mismatch (m)', () => {
    expect(() => kalmanFilterStep({
      x: [0],
      P: [[1]],
      F: [[1]],
      Q: [[0]],
      z: [0, 0],
      H: [[1]],
      R: [[1, 0], [0, 1]],
    })).toThrow();
  });

  it('1D scalar Kalman: prior x=0,P=1; F=1,Q=0; H=1,R=1; z=2', () => {
    const out = kalmanFilterStep({
      x: [0], P: [[1]], F: [[1]], Q: [[0]],
      z: [2], H: [[1]], R: [[1]],
    });
    // K = P/(P+R) = 1/2; x = 0 + 0.5*(2-0) = 1; P = (1 - 0.5)*1 = 0.5
    expect(out.x[0]).toBeCloseTo(1, 12);
    expect(out.P[0][0]).toBeCloseTo(0.5, 12);
  });

  it('1D with process noise Q', () => {
    const out = kalmanFilterStep({
      x: [0], P: [[1]], F: [[1]], Q: [[1]],
      z: [4], H: [[1]], R: [[1]],
    });
    // PPred = 1+1=2; S=2+1=3; K=2/3; y=4; x = 0 + (2/3)*4 = 8/3; P = (1-2/3)*2 = 2/3
    expect(out.x[0]).toBeCloseTo(8 / 3, 12);
    expect(out.P[0][0]).toBeCloseTo(2 / 3, 12);
  });

  it('perfect measurement (R=0) => posterior matches z (1D)', () => {
    const out = kalmanFilterStep({
      x: [10], P: [[5]], F: [[1]], Q: [[0]],
      z: [42], H: [[1]], R: [[1e-12]],
    });
    expect(out.x[0]).toBeCloseTo(42, 6);
    expect(out.P[0][0]).toBeLessThan(1e-6);
  });

  it('measurement variance huge => prior dominates', () => {
    const out = kalmanFilterStep({
      x: [10], P: [[1]], F: [[1]], Q: [[0]],
      z: [100], H: [[1]], R: [[1e10]],
    });
    expect(out.x[0]).toBeCloseTo(10, 5);
  });

  it('2D state, 1D measurement of position', () => {
    // [pos; vel], constant velocity model F = [[1,1],[0,1]]
    const out = kalmanFilterStep({
      x: [0, 0],
      P: [[1, 0], [0, 1]],
      F: [[1, 1], [0, 1]],
      Q: [[0, 0], [0, 0]],
      z: [1],
      H: [[1, 0]],
      R: [[1]],
    });
    // PPred = F P F^T = [[2,1],[1,1]]; S = 2+1 = 3; K = [2/3; 1/3]; x = [0 + 2/3; 0 + 1/3]
    expect(out.x[0]).toBeCloseTo(2 / 3, 12);
    expect(out.x[1]).toBeCloseTo(1 / 3, 12);
  });

  it('returns new objects (does not mutate input x)', () => {
    const x = [0];
    const out = kalmanFilterStep({
      x, P: [[1]], F: [[1]], Q: [[0]],
      z: [1], H: [[1]], R: [[1]],
    });
    expect(x).toEqual([0]);
    expect(out.x).not.toBe(x);
  });

  it('posterior covariance reduces variance', () => {
    const out = kalmanFilterStep({
      x: [0], P: [[10]], F: [[1]], Q: [[0]],
      z: [5], H: [[1]], R: [[1]],
    });
    expect(out.P[0][0]).toBeLessThan(10);
  });

  it('two consecutive identical measurements converge toward z', () => {
    let state: { x: number[]; P: number[][] } = { x: [0], P: [[10]] };
    for (let i = 0; i < 10; i++) {
      state = kalmanFilterStep({
        x: state.x, P: state.P, F: [[1]], Q: [[0]],
        z: [3], H: [[1]], R: [[1]],
      });
    }
    expect(state.x[0]).toBeCloseTo(3, 1);
  });

  it('2D innovation singular R throws', () => {
    expect(() => kalmanFilterStep({
      x: [0, 0],
      P: [[0, 0], [0, 0]],
      F: [[1, 0], [0, 1]],
      Q: [[0, 0], [0, 0]],
      z: [0, 0],
      H: [[1, 0], [0, 1]],
      R: [[0, 0], [0, 0]],
    })).toThrow();
  });

  it('returns covariance dims n x n', () => {
    const out = kalmanFilterStep({
      x: [0, 0, 0],
      P: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      F: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      Q: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      z: [1],
      H: [[1, 0, 0]],
      R: [[1]],
    });
    expect(out.P).toHaveLength(3);
    expect(out.P[0]).toHaveLength(3);
    expect(out.x).toHaveLength(3);
  });
});
