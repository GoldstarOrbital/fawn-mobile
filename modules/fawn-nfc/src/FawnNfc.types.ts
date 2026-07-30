export type FawnNfcModuleEvents = {
  onHceResponse: (params: HceResponseEvent) => void;
  onHceError: (params: HceErrorEvent) => void;
};

export type HceResponseEvent = {
  deviceId: string;
  signatureB64: string;
};

export type HceErrorEvent = {
  message: string;
};
