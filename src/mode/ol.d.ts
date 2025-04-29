import type {
  doNotEditAndPersistent,
  measurementModeSymbol,
  measurementGeometryType,
} from './measurementMode.js';

declare module 'ol' {
  interface Feature {
    [measurementModeSymbol]?: measurementGeometryType;
    [doNotEditAndPersistent]?: boolean;
  }
}
