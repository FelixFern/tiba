import { NativeModule, requireNativeModule } from 'expo';
import { LiveNotificationState } from './TibaLiveNotification.types';

declare class TibaLiveNotificationModule extends NativeModule<{}> {
  /** Post or update the custom live-card notification (Android RemoteViews). */
  update(state: LiveNotificationState): void;
  /** Remove the live-card notification. */
  end(): void;
}

export default requireNativeModule<TibaLiveNotificationModule>('TibaLiveNotification');
