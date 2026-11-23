import { patcher } from '@unbound-app/api';

import { patchAvatarDeviceStatus } from '~/patches/avatar-device-status';

export function start() {
  patchAvatarDeviceStatus();
}

export function stop() {
  patcher.unpatchAll();
}
