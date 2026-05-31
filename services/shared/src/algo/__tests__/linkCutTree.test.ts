import { describe, it, expect } from 'vitest';
import { linkCutTree, LinkCutTree } from '../linkCutTree';

describe('linkCutTree', () => {
  it('factory + class', () => {
    expect(linkCutTree() instanceof LinkCutTree).toBe(true);
  });

  it('addNode returns sequential ids', () => {
    const t = linkCutTree();
    expect(t.addNode(1)).toBe(0);
    expect(t.addNode(2)).toBe(1);
    expect(t.size()).toBe(2);
  });

  it('node connected to itself', () => {
    const t = linkCutTree();
    const a = t.addNode(5);
    expect(t.connected(a, a)).toBe(true);
  });

  it('link makes two nodes connected', () => {
    const t = linkCutTree();
    const a = t.addNode(0);
    const b = t.addNode(0);
    expect(t.connected(a, b)).toBe(false);
    expect(t.link(a, b)).toBe(true);
    expect(t.connected(a, b)).toBe(true);
  });

  it('link in same tree returns false', () => {
    const t = linkCutTree();
    const a = t.addNode();
    const b = t.addNode();
    t.link(a, b);
    expect(t.link(a, b)).toBe(false);
  });

  it('cut disconnects', () => {
    const t = linkCutTree();
    const a = t.addNode();
    const b = t.addNode();
    t.link(a, b);
    expect(t.cut(a, b)).toBe(true);
    expect(t.connected(a, b)).toBe(false);
  });

  it('cut of non-edge returns false', () => {
    const t = linkCutTree();
    const a = t.addNode();
    const b = t.addNode();
    const c = t.addNode();
    t.link(a, b);
    expect(t.cut(a, c)).toBe(false);
  });

  it('pathSum on a chain', () => {
    const t = linkCutTree();
    const ids: number[] = [];
    for (let i = 1; i <= 5; i += 1) ids.push(t.addNode(i));
    for (let i = 0; i + 1 < ids.length; i += 1) t.link(ids[i], ids[i + 1]);
    expect(t.pathSum(ids[0], ids[4])).toBe(15);
    expect(t.pathSum(ids[1], ids[3])).toBe(9);
  });

  it('pathSum returns null when disconnected', () => {
    const t = linkCutTree();
    const a = t.addNode(1);
    const b = t.addNode(2);
    expect(t.pathSum(a, b)).toBeNull();
  });

  it('setValue affects pathSum', () => {
    const t = linkCutTree();
    const a = t.addNode(1);
    const b = t.addNode(2);
    t.link(a, b);
    expect(t.pathSum(a, b)).toBe(3);
    t.setValue(a, 10);
    expect(t.pathSum(a, b)).toBe(12);
  });

  it('throws on bad node id', () => {
    const t = linkCutTree();
    expect(() => t.connected(0, 1)).toThrow();
  });

  it('connected forest tracking', () => {
    const t = linkCutTree();
    const ids: number[] = [];
    for (let i = 0; i < 6; i += 1) ids.push(t.addNode());
    t.link(ids[0], ids[1]);
    t.link(ids[1], ids[2]);
    t.link(ids[3], ids[4]);
    expect(t.connected(ids[0], ids[2])).toBe(true);
    expect(t.connected(ids[0], ids[3])).toBe(false);
    expect(t.connected(ids[3], ids[4])).toBe(true);
    expect(t.connected(ids[5], ids[0])).toBe(false);
  });
});
