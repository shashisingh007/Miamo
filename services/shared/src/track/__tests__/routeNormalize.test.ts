import { describe, it, expect } from 'vitest';
import { normalizeRoute, routeFromRouter } from '../routeNormalize';

describe('normalizeRoute', () => {
  it('returns "/" for empty / null / undefined / "/"', () => {
    expect(normalizeRoute(null)).toBe('/');
    expect(normalizeRoute(undefined)).toBe('/');
    expect(normalizeRoute('')).toBe('/');
    expect(normalizeRoute('/')).toBe('/');
  });

  it('preserves static routes', () => {
    expect(normalizeRoute('/discover')).toBe('/discover');
    expect(normalizeRoute('/messages/inbox')).toBe('/messages/inbox');
  });

  it('strips query and hash', () => {
    expect(normalizeRoute('/discover?tab=new#top')).toBe('/discover');
  });

  it('replaces numeric segments with :id', () => {
    expect(normalizeRoute('/profile/12345')).toBe('/profile/:id');
    expect(normalizeRoute('/threads/9/messages/42')).toBe('/threads/:id/messages/:id');
  });

  it('replaces UUIDs with :id', () => {
    expect(normalizeRoute('/match/8400ec40-7a1f-4f7c-9aaa-d2e44de1f37e'))
      .toBe('/match/:id');
  });

  it('replaces long hex strings with :id', () => {
    expect(normalizeRoute('/user/deadbeef0123abcd0123')).toBe('/user/:id');
  });

  it('keeps short slugs as-is', () => {
    expect(normalizeRoute('/blog/v6-launch')).toBe('/blog/v6-launch');
  });

  it('caps depth at 6 segments', () => {
    expect(normalizeRoute('/a/b/c/d/e/f/g/h')).toBe('/a/b/c/d/e/f/…');
  });

  it('handles trailing slash gracefully', () => {
    expect(normalizeRoute('/discover/')).toBe('/discover');
  });
});

describe('routeFromRouter', () => {
  it('prefers pathname when available and converts [id] -> :id', () => {
    expect(routeFromRouter({ pathname: '/profile/[id]', asPath: '/profile/123' }))
      .toBe('/profile/:id');
  });

  it('falls back to normalising asPath when pathname missing', () => {
    expect(routeFromRouter({ asPath: '/threads/42' })).toBe('/threads/:id');
  });

  it('returns "/" for null / empty router', () => {
    expect(routeFromRouter(null)).toBe('/');
    expect(routeFromRouter({})).toBe('/');
  });

  it('handles multiple [param] segments', () => {
    expect(routeFromRouter({ pathname: '/u/[uid]/album/[albumId]' }))
      .toBe('/u/:uid/album/:albumId');
  });
});
