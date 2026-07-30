export type FawnNfcModuleEvents = {
  onHceResponse: (params: HceResponseEvent) => void;
  onHceError: (params: HceErrorEvent) => void;
};

export type HceResponseEvent = {
  deviceId: string;
  signatureB64: string;
  signatureBytes: number;
  readerWaitMs: number;
  apduRoundTripMs: number;
  tagTechnologies: string[];
};

export type HceErrorEvent = {
  message: string;
  readerElapsedMs: number;
};
