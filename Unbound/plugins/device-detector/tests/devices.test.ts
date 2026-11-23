import { describe, expect, test } from 'bun:test';

import { ownClientStatus, resolveDeviceStatuses } from '~/lib/devices';

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
    expect(resolveDeviceStatuses({ mobile: 'unknown', desktop: 'offline' })).toEqual([]);
    expect(resolveDeviceStatuses({ mobile: 'invisible' })).toEqual([]);
  });
});

describe('ownClientStatus', () => {
  test('reads mobile and desktop clients from active Discord sessions', () => {
    expect(ownClientStatus({
      mobileSession: {
        status: 'idle',
        clientInfo: { client: 'mobile' },
      },
      desktopSession: {
        status: 'online',
        clientInfo: { client: 'desktop' },
      },
    })).toEqual({
      mobile: 'idle',
      desktop: 'online',
    });
  });

  test('keeps the most active status when the same client has multiple sessions', () => {
    expect(ownClientStatus({
      idleDesktop: {
        status: 'idle',
        clientInfo: { client: 'desktop' },
      },
      onlineDesktop: {
        status: 'online',
        clientInfo: { client: 'desktop' },
      },
    })).toEqual({ desktop: 'online' });
  });

  test('uses Unbound’s mobile fallback for a readable but empty sessions object', () => {
    expect(ownClientStatus({})).toEqual({ mobile: 'online' });
  });

  test('rejects missing or invalid session data', () => {
    expect(ownClientStatus(null)).toBeNull();
    expect(ownClientStatus(undefined)).toBeNull();
    expect(ownClientStatus([])).toBeNull();
  });
});
