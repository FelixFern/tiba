import Constants, { ExecutionEnvironment } from 'expo-constants';

// True when running inside the Expo Go sandbox, where custom native modules
// (background TaskManager, MMKV, full notification channels) aren't available.
// We use this to degrade gracefully to foreground-only behavior for UI work.
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
