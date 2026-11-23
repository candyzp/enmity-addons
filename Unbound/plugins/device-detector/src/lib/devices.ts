export type DevicePlatform = 'mobile' | 'desktop';
export type DevicePresence = 'online' | 'idle' | 'dnd';

export type DeviceStatus = {
  platform: DevicePlatform;
  status: DevicePresence;
  color: string;
};

export type ClientStatusMap = Record<string, unknown>;

export const STATUS_COLORS: Record<DevicePresence, string> = {
  online: '#23a55a',
  idle: '#f0b232',
  dnd: '#f23f43',
};

const DEVICE_ORDER: DevicePlatform[] = ['mobile', 'desktop'];

/**
 * Converts Discord's per-client presence into the phone/PC badges this addon supports.
 * A web-only session is intentionally treated as unknown: Discord does not tell us
 * whether that browser session is running on a phone or a computer.
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
