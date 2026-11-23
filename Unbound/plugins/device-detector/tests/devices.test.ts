import { describe, expect, test } from 'bun:test';

import { resolveDeviceStatuses } from '~/lib/devices';

describe('resolveDeviceStatuses', () => {
  test('maps mobile and desktop sessions independently', () => {
    expect(resolveDeviceStatuses({
      mobile: 'idle',
      desktop: 'dnd',
    })).toEqual([
      { platform: 'mobile', status: 'idle', color: '#f0b232' },
      { platform: 'desktop', status: 'dnd', color: '#f23f43' },
    ]);
  });

  test('shows a phone for an online mobile session', () => {
    expect(resolveDeviceStatuses({ mobile: 'online' })).toEqual([
      { platform: 'mobile', status: 'online', color: '#23a55a' },
    ]);
  });

  test('does not guess from a web-only session', () => {
    expect(resolveDeviceStatuses({ web: 'online' })).toEqual([]);
  });

  test('returns no device markers when presence data is missing or invalid', () => {
    expect(resolveDeviceStatuses(null)).toEqual([]);
    expect(resolveDeviceStatuses(undefined)).toEqual([]);
    expect(resolveDeviceStatuses('online')).toEqual([]);
    expect(resolveDeviceStatuses({ mobile: 'offline', desktop: 'unknown' })).toEqual([]);
  });
});
