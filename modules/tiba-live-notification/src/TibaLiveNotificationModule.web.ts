import { registerWebModule, NativeModule } from 'expo';
import { LiveNotificationState } from './TibaLiveNotification.types';

class TibaLiveNotificationModule extends NativeModule<{}> {
  // No-ops on web — there is no notification surface.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_state: LiveNotificationState): void {}
  end(): void {}
}

export default registerWebModule(TibaLiveNotificationModule, 'TibaLiveNotificationModule');
