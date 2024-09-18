import {
  doNotEditAndPersistent,
  measurementModeSymbol,
  MeasurementGeometryType,
} from './measurementMode.js';

declare module 'ol' {
  interface Feature {
    [measurementModeSymbol]?: MeasurementGeometryType;
    [doNotEditAndPersistent]?: boolean;
  }
}
