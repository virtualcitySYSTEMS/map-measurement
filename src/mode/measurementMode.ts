import Feature from 'ol/Feature.js';
import type { Projection, VcsMap } from '@vcmap/core';
import {
  CesiumMap,
  GeometryType,
  getDefaultProjection,
  getTextFromOptions,
  ObliqueMap,
  OpenlayersMap,
  originalFeatureSymbol,
  wgs84Projection,
} from '@vcmap/core';
import type { VcsUiApp } from '@vcmap/ui';
import type { ShallowRef } from 'vue';
import { shallowRef } from 'vue';
import type { Text } from 'ol/style.js';
import type { MeasurementManager } from '../measurementManager.js';

export type MeasurementValues = {
  type: MeasurementType;
  area?: string;
  circumference?: string;
  distance?: string;
  height?: string;
  /** angle in vertical measurement */
  alpha?: string;
  /** angle in vertical measurement */
  beta?: string;
  /** horizontal distance in vertical measurement */
  horizontal?: string;
  /** point measurement coordinates */
  pointPosition?: PositionValue;
  /** positions of distance measurement coordinates */
  vertexPositions?: Array<PositionValue>;

  groundAltitude?: string;
  heightAltitude?: string;
};
/**
 * @api
 */

type PositionValue = {
  id: string | undefined;
  name: string | undefined;
  /** point measurement coordinates */
  x: number | undefined;
  /** point measurement coordinates */
  y: number | undefined;
  /** point measurement coordinates */
  z: number | undefined;
};

export const measurementModeSymbol = Symbol('measurementModeSymbol');

export const doNotEditAndPersistent = Symbol('doNotEditAndPersistentSymbol');

export const measurementTypeProperty = 'vcs_measurement_type';

export enum MeasurementType {
  Position3D = 'Position3D',
  Position2D = 'Position2D',
  Distance2D = 'Distance2D',
  Area2D = 'Area2D',
  Distance3D = 'Distance3D',
  Area3D = 'Area3D',
  Height3D = 'Height3D',
  ObliqueHeight2D = 'ObliqueHeight2D',
}

export const measurementGeometryType = {
  [MeasurementType.Position3D]: GeometryType.Point,
  [MeasurementType.Position2D]: GeometryType.Point,
  [MeasurementType.Distance2D]: GeometryType.LineString,
  [MeasurementType.Area2D]: GeometryType.Polygon,
  [MeasurementType.Distance3D]: GeometryType.LineString,
  [MeasurementType.Area3D]: GeometryType.Polygon,
  [MeasurementType.Height3D]: GeometryType.LineString,
  [MeasurementType.ObliqueHeight2D]: GeometryType.LineString,
};

export function getValues(feature: Feature): MeasurementValues {
  if (feature[measurementModeSymbol]) {
    return feature[measurementModeSymbol].values.value as MeasurementValues;
  }
  return feature[originalFeatureSymbol]?.[measurementModeSymbol]?.values
    .value as MeasurementValues;
}

export function isSupportedMeasurement(feature: Feature, map: VcsMap): boolean {
  const supportedMaps: string[] =
    feature[measurementModeSymbol]?.supportedMaps ??
    feature[originalFeatureSymbol]?.[measurementModeSymbol]?.supportedMaps ??
    [];
  return supportedMaps.includes(map.className);
}
function getDecimalPlacesForProjection(projection: Projection): number {
  return projection.epsg === wgs84Projection.epsg ? 6 : 2;
}
type MeasurementModeOptions = {
  app: VcsUiApp;
  manager: MeasurementManager;
};

class MeasurementMode {
  app: VcsUiApp;

  manager: MeasurementManager;

  projection: Projection;

  crsDecimalPlaces: number;

  decimalPlaces: number;

  templateFeature: Feature;

  values: ShallowRef<MeasurementValues>;

  constructor(options: MeasurementModeOptions) {
    this.app = options.app;
    this.manager = options.manager;
    this.projection = getDefaultProjection();
    this.crsDecimalPlaces = getDecimalPlacesForProjection(this.projection);
    this.decimalPlaces = 2;
    this.templateFeature = this.createTemplateFeature();
    this.values = shallowRef(this.defaultValues);
  }

  get defaultValues(): MeasurementValues {
    return {
      type: this.type,
      area: '0',
      circumference: '0',
      distance: '0',
      height: '0',
      alpha: '0',
      beta: '0',
      horizontal: '0',
      pointPosition: undefined,
      vertexPositions: [],
    };
  }

  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Area2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.Polygon;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className];
  }

  getValue(value: number, square = false): string {
    let abs = Math.abs(value);
    const potential = square ? 2 : 1;
    let unit = square ? 'm²' : 'm';
    const cutoff = 1000 ** potential;
    if (abs > cutoff * (square ? 1 : 10)) {
      abs /= cutoff;
      unit = `k${unit}`;
    }

    const formattedValue =
      (value < 0 ? '-' : '') + abs.toFixed(this.decimalPlaces);
    return `${formattedValue} ${unit}`;
  }

  // eslint-disable-next-line class-methods-use-this
  check(feature: Feature): boolean {
    const geometry = feature.getGeometry();
    if (!geometry) {
      return false;
    }

    return geometry.getCoordinates().length !== 0;
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    return Promise.resolve(this.check(feature));
  }

  createTemplateFeature(): Feature {
    const feature = new Feature();
    feature.set(measurementTypeProperty, this.type);
    return feature;
  }

  static getDefaultText(): Text {
    return getTextFromOptions({
      font: 'bold 18px Arial',
      textBaseline: 'bottom',
      offsetY: -20,
      offsetX: 0,
      fill: {
        color: [3, 9, 53, 1],
      },
      stroke: {
        color: [255, 255, 255, 1],
        width: 2,
      },
    });
  }

  setProjection(projection: Projection): void {
    if (projection.epsg !== this.projection.epsg) {
      this.projection = projection;
      this.crsDecimalPlaces = getDecimalPlacesForProjection(projection);
    }
  }
}

export default MeasurementMode;
