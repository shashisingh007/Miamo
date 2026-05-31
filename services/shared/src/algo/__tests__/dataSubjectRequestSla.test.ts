import { describe, it, expect } from 'vitest';
import {
  evaluateDataSubjectRequest,
  summarizeDataSubjectRequests,
  type DataSubjectRequest,
} from '../dataSubjectRequestSla';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const base: DataSubjectRequest = {
  id: 'r1',
  kind: 'access',
  status: 'received',
  receivedAtMs: NOW - DAY,
};

describe('dataSubjectRequestSla', () => {
  it('fresh request -> on_time + verify', () => {
    const e = evaluateDataSubjectRequest(base, NOW);
    expect(e.state).toBe('on_time');
    expect(e.nextAction).toBe('verify');
  });

  it('past 75% of SLA -> due_soon', () => {
    const r = { ...base, receivedAtMs: NOW - 25 * DAY };
    expect(evaluateDataSubjectRequest(r, NOW).state).toBe('due_soon');
  });

  it('past 100% of SLA -> overdue', () => {
    const r = { ...base, receivedAtMs: NOW - 31 * DAY };
    expect(evaluateDataSubjectRequest(r, NOW).state).toBe('overdue');
  });

  it('fulfilled -> closed/none', () => {
    const r: DataSubjectRequest = { ...base, status: 'fulfilled', fulfilledAtMs: NOW };
    const e = evaluateDataSubjectRequest(r, NOW);
    expect(e.state).toBe('closed');
    expect(e.nextAction).toBe('none');
  });

  it('rejected -> closed/none', () => {
    const r: DataSubjectRequest = { ...base, status: 'rejected' };
    expect(evaluateDataSubjectRequest(r, NOW).nextAction).toBe('none');
  });

  it('verifying status -> nextAction=verify', () => {
    const r: DataSubjectRequest = { ...base, status: 'verifying' };
    expect(evaluateDataSubjectRequest(r, NOW).nextAction).toBe('verify');
  });

  it('in_progress -> nextAction=fulfil', () => {
    const r: DataSubjectRequest = {
      ...base,
      status: 'in_progress',
      verifiedAtMs: NOW - DAY,
    };
    expect(evaluateDataSubjectRequest(r, NOW).nextAction).toBe('fulfil');
  });

  it('remainingMs floor at 0', () => {
    const r = { ...base, receivedAtMs: NOW - 100 * DAY };
    expect(evaluateDataSubjectRequest(r, NOW).remainingMs).toBe(0);
  });

  it('slaMs is 30 days for all kinds', () => {
    const r1 = { ...base, kind: 'erasure' as const };
    const r2 = { ...base, kind: 'portability' as const };
    expect(evaluateDataSubjectRequest(r1, NOW).slaMs).toBe(30 * DAY);
    expect(evaluateDataSubjectRequest(r2, NOW).slaMs).toBe(30 * DAY);
  });

  it('summarize counts by state', () => {
    const reqs: DataSubjectRequest[] = [
      { ...base, id: '1' }, // on_time
      { ...base, id: '2', receivedAtMs: NOW - 25 * DAY }, // due_soon
      { ...base, id: '3', receivedAtMs: NOW - 31 * DAY }, // overdue
      { ...base, id: '4', status: 'fulfilled' }, // closed
    ];
    const s = summarizeDataSubjectRequests(reqs, NOW);
    expect(s).toEqual({ overdue: 1, dueSoon: 1, onTime: 1, closed: 1 });
  });

  it('future receivedAtMs treated as elapsed=0', () => {
    const r = { ...base, receivedAtMs: NOW + DAY };
    const e = evaluateDataSubjectRequest(r, NOW);
    expect(e.state).toBe('on_time');
    expect(e.remainingMs).toBe(30 * DAY);
  });
});
