import { registerWebModule, NativeModule } from 'expo';

import { FawnNfcModuleEvents } from './FawnNfc.types';

// FawnNfcModule is not available on the web platform.
class FawnNfcModule extends NativeModule<FawnNfcModuleEvents> {
  isSupported() { return false; }
  isNfcEnabled() { return false; }
  getDeviceName() { return 'Web browser'; }
}

export default registerWebModule(FawnNfcModule, 'FawnNfcModule');
