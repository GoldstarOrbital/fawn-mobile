import { NativeModule, requireOptionalNativeModule } from 'expo';

import { FawnNfcModuleEvents } from './FawnNfc.types';

declare class FawnNfcModule extends NativeModule<FawnNfcModuleEvents> {
  isSupported(): boolean;
  isNfcEnabled(): boolean;
  getDeviceName(): string;
  getOrCreatePublicKeyAsync(): Promise<string>;
  configureDeviceAsync(deviceId: string): Promise<void>;
  clearDeviceAsync(): Promise<void>;
  startReaderAsync(challengeB64: string): Promise<void>;
  stopReaderAsync(): Promise<void>;
}

export default requireOptionalNativeModule<FawnNfcModule>('FawnNfc');
