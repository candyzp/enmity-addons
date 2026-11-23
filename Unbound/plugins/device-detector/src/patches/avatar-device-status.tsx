import type { AnyProps } from '@unbound-app/api/metro';
import { flux, metro, patcher } from '@unbound-app/api';
import { useMemo } from 'react';
import { View } from 'react-native';

import {
  resolveDeviceStatuses,
  type DeviceStatus,
} from '~/lib/devices';

type PresenceStoreShape = {
  getClientStatus?: (userId: string) => unknown;
};

type AvatarProps = {
  status?: string;
  isMobileOnline?: boolean;
  isVROnline?: boolean;
  user?: { id?: string };
} & AnyProps;

type RenderTarget = {
  holder: AnyProps;
  key: string;
};

const PresenceStore = flux.getStore('Presence') as unknown as PresenceStoreShape;

const ICONS = {
  mobile: {
    path: 'M 187 0 L 813 0 C 916.277 0 1000 83.723 1000 187 L 1000 1313 C 1000 1416.277 916.277 1500 813 1500 L 187 1500 C 83.723 1500 0 1416.277 0 1313 L 0 187 C 0 83.723 83.723 0 187 0 Z M 125 1000 L 875 1000 L 875 250 L 125 250 Z M 500 1125 C 430.964 1125 375 1180.964 375 1250 C 375 1319.036 430.964 1375 500 1375 C 569.036 1375 625 1319.036 625 1250 C 625 1180.964 569.036 1125 500 1125 Z',
    viewBox: '0 0 1000 1500',
    width: 7,
    height: 10,
  },
  desktop: {
    path: 'M4 2.5c-1.103 0-2 .897-2 2v11c0 1.104.897 2 2 2h7v2H7v2h10v-2h-4v-2h7c1.103 0 2-.896 2-2v-11c0-1.103-.897-2-2-2H4Zm16 2v9H4v-9h16Z',
    viewBox: '0 0 24 24',
    width: 10,
    height: 10,
  },
} as const;

function findRenderTarget(owner: AnyProps, key = 'default'): RenderTarget | null {
  let holder = owner;
  let prop = key;
  let current = owner[key];

  while (current && typeof current === 'object') {
    const component = current as AnyProps;
    const next = component.type ? 'type' : component.render ? 'render' : null;

    if (!next) break;

    holder = component;
    prop = next;
    current = component[next];
  }

  return typeof current === 'function' ? { holder, key: prop } : null;
}

function useDeviceStatuses(userId: string): DeviceStatus[] {
  const key = flux.useStore(
    [PresenceStore],
    () => JSON.stringify(resolveDeviceStatuses(PresenceStore.getClientStatus?.(userId))),
    { deps: [userId] },
  );

  return useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(key);
      return Array.isArray(parsed) ? parsed as DeviceStatus[] : [];
    } catch {
      return [];
    }
  }, [key]);
}

function DeviceBadge({ device }: { device: DeviceStatus }) {
  const { Svg, Path } = metro.common.SVG;
  const icon = ICONS[device.platform];

  return (
    <View
      style={{
        width: 15,
        height: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e1f22',
        borderWidth: 1,
        borderColor: '#404249',
      }}
    >
      <Svg width={icon.width} height={icon.height} viewBox={icon.viewBox} fill={device.color}>
        <Path d={icon.path} />
      </Svg>
    </View>
  );
}

function DeviceBadges({ userId }: { userId: string }) {
  const devices = useDeviceStatuses(userId);

  if (!devices.length) return null;

  return (
    <View
      pointerEvents='none'
      style={{
        position: 'absolute',
        right: -4,
        bottom: -4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        padding: 1,
        borderRadius: 9,
      }}
    >
      {devices.map((device) => (
        <DeviceBadge key={device.platform} device={device} />
      ))}
    </View>
  );
}

/**
 * Replaces Discord's avatar status dot only when a phone or desktop session is
 * explicitly present. When the session data is absent or unsupported, the
 * original Avatar render path is returned untouched.
 */
export function patchAvatarDeviceStatus(): void {
  if (typeof PresenceStore?.getClientStatus !== 'function') {
    logger.warn('Device Detector skipped: Discord moved PresenceStore.getClientStatus.');
    return;
  }

  const module = metro.findByFilePath(
    'design/void/Avatar/native/Avatar.tsx',
    { interop: false },
  );

  const render = module ? findRenderTarget(module) : null;

  if (!render) {
    logger.warn('Device Detector skipped: Discord moved the native Avatar component.');
    return;
  }

  patcher.instead(render.holder, render.key, ({ args, original, this: self }) => {
    const [props, ...rest] = args as [AvatarProps | undefined, ...unknown[]];
    const userId = props?.user?.id;

    if (typeof userId !== 'string' || !userId) {
      return original.apply(self, args);
    }

    const devices = resolveDeviceStatuses(PresenceStore.getClientStatus(userId));

    if (!devices.length) {
      return original.apply(self, args);
    }

    const avatar = original.apply(self, [
      {
        ...props,
        status: undefined,
        isMobileOnline: false,
        isVROnline: false,
      },
      ...rest,
    ]);

    return (
      <View style={{ alignSelf: 'flex-start', position: 'relative' }}>
        {avatar}
        <DeviceBadges userId={userId} />
      </View>
    );
  });
}
