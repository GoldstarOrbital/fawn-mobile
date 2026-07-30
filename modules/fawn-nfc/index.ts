// Re-export the native module. On web, it will be resolved to FawnNfcModule.web.ts
// and on native platforms to FawnNfcModule.ts
export { default } from './src/FawnNfcModule';
export * from './src/FawnNfc.types';
