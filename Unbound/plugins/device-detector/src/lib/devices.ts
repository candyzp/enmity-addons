export type DevicePlatform = 'mobile' | 'desktop';
export type DevicePresence = 'online' | 'idle' | 'dnd';

export type DeviceStatus = {
  platform: DevicePlatform;
  status: DevicePresence;
  color: string;
};

export type ClientStatusMap = Record<string, unknown>;

type Session = {
  status?: unknown;
  clientInfo?: { client?: unknown };
};

export const STATUS_COLORS: Record<DevicePresence, string> = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
};

const DEVICE_ORDER: DevicePlatform[] = ['mobile', 'desktop'];

const SESSION_STATUS_RANK: Record<string, number> = {
  online: 2,
  idle: 1,
};

/**
 * Builds the signed-in user's client status from Discord's active sessions.
 * Discord does not expose the current user's presence through PresenceStore.
 */
export function ownClientStatus(value: unknown): ClientStatusMap | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const sessions = Object.values(value as Record<string, unknown>) as Session[];
  sessions.sort(
    (a, b) =>
      (SESSION_STATUS_RANK[String(a?.status)] ?? 0) -
      (SESSION_STATUS_RANK[String(b?.status)] ?? 0),
  );

  const statuses: ClientStatusMap = {};

  for (const session of sessions) {
    const client = session?.clientInfo?.client;
    const status = session?.status;

    if (typeof client === 'string' && client && client !== 'unknown' &&
        typeof status === 'string' && status) {
      statuses[client] = status;
    }
  }

  // The Unbound Platform Indicators addon uses this fallback when Discord
  // exposes a sessions object but omits the active mobile session.
  return Object.keys(statuses).length ? statuses : { mobile: 'online' };
}

/**
 * Converts Discord's per-client presence into the phone and PC badges this
 * addon supports. A web-only session is intentionally not guessed.
 */
export function resolveDeviceStatuses(value: unknown): DeviceStatus[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];

  const clientStatus = value as ClientStatusMap;

  return DEVICE_ORDER.flatMap((platform) => {
    const status = clientStatus[platform];

    if (status !== 'online' && status !== 'idle' && status !== 'dnd') return [];

    return [{
      platform,
      status,
      color: STATUS_COLORS[status],
    }];
  });
}
