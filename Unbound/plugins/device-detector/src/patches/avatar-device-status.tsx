import type { AnyProps } from '@unbound-app/api/metro';
import type { FluxStore } from '@unbound-app/api/flux';
import { flux, metro, patcher } from '@unbound-app/api';
import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  isActiveDiscordStatus,
  ownClientStatus,
  resolveDeviceStatuses,
  type DeviceStatus,
} from '~/lib/devices';

type PresenceStoreShape = FluxStore & {
  getClientStatus?: (userId: string) => unknown;
};

type SessionsStoreShape = FluxStore & {
  getSessions?: () => unknown;
};

type UserStoreShape = FluxStore & {
  getCurrentUser?: () => { id?: string } | null;
};

type AvatarProps = {
  user?: { id?: string };
  status?: string;
} & AnyProps;

type RenderTarget = {
  holder: AnyProps;
  key: string;
};

type OriginalRender = {
  apply(thisArg: unknown, args: unknown[]): ReactNode;
};

const PresenceStore = flux.getStore('Presence') as PresenceStoreShape;
const SessionsStore = flux.getStore('Sessions') as SessionsStoreShape;
const UserStore = flux.getStore('User') as UserStoreShape;

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

/** Discord does not publish the signed-in user's presence through PresenceStore. */
function getClientStatus(userId: string): unknown {
  if (userId === UserStore.getCurrentUser?.()?.id) {
    return ownClientStatus(SessionsStore.getSessions?.());
  }

  return PresenceStore.getClientStatus?.(userId);
}

function useDeviceStatuses(userId: string): DeviceStatus[] {
  const key = flux.useStore(
    [PresenceStore, SessionsStore],
    () => JSON.stringify(resolveDeviceStatuses(getClientStatus(userId))),
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
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: device.color,
        borderWidth: 2,
        borderColor: '#1e1f22',
      }}
    >
      <Svg width={icon.width} height={icon.height} viewBox={icon.viewBox}>
        <Path d={icon.path} fill='#ffffff' />
      </Svg>
    </View>
  );
}

function DeviceBadges({
  userId,
  avatarStatus,
}: {
  userId: string;
  avatarStatus?: string;
}) {
  const devices = useDeviceStatuses(userId);

  // Never replace the native indicator during a temporary/unknown presence state.
  if (!isActiveDiscordStatus(avatarStatus) || !devices.length) return null;

  return (
    <View
      pointerEvents='none'
      style={{
        // Match Unbound's own Avatar ring anchor: the picture sits at the left
        // of a slightly wider wrapper because Discord reserves room for its dot.
        position: 'absolute',
        top: -3,
        left: -3,
        bottom: -3,
        aspectRatio: 1,
      }}
    >
      <View
        style={{
          position: 'absolute',
          right: -6,
          bottom: -6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {devices.map((device) => (
          <DeviceBadge key={device.platform} device={device} />
        ))}
      </View>
    </View>
  );
}

/**
 * Adds a solid status-colored phone/PC badge without changing Discord's status prop
 * or writing to any presence store. Unknown/offline states keep the native dot.
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
    const [props] = args as [AvatarProps | undefined];
    const userId = props?.user?.id;

    if (typeof userId !== 'string' || !userId) {
      return original.apply(self, args);
    }

    const avatar = original.apply(self, args);

    return (
      <View
        style={{ alignSelf: 'flex-start', position: 'relative' }}
        pointerEvents='box-none'
      >
        {avatar}
        <DeviceBadges userId={userId} avatarStatus={props?.status} />
      </View>
    );
  });
}
