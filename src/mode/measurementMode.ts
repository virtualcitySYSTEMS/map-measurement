import Feature from 'ol/Feature.js';
import {
  CesiumMap,
  GeometryType,
  getDefaultProjection,
  getTextFromOptions,
  ObliqueMap,
  OpenlayersMap,
  originalFeatureSymbol,
  Projection,
  VcsMap,
} from '@vcmap/core';
import { VcsUiApp } from '@vcmap/ui';
import { ShallowRef, shallowRef } from 'vue';
import { Text } from 'ol/style.js';
import { MeasurementManager } from '../measurementManager.js';

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

export const MeasurementGeometryType = {
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

type MeasurementModeOptions = {
  app: VcsUiApp;
  manager: MeasurementManager;
};

class MeasurementMode {
  app: VcsUiApp;

  manager: MeasurementManager;

  projection: Projection;

  decimalPlaces: number;

  templateFeature: Feature;

  values: ShallowRef<MeasurementValues>;

  constructor(options: MeasurementModeOptions) {
    this.app = options.app;
    this.manager = options.manager;
    this.projection = getDefaultProjection();
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
    return `${abs.toFixed(this.decimalPlaces)} ${unit}`;
  }

  // eslint-disable-next-line class-methods-use-this
  check(feature: Feature): boolean {
    const geometry = feature.getGeometry();
    if (!geometry) {
      return false;
    }

    if (geometry.getCoordinates().length === 0) {
      return false;
    }

    return true;
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    return Promise.resolve(this.check(feature));
  }

  // eslint-disable-next-line class-methods-use-this
  createTemplateFeature(): Feature {
    const feature = new Feature();
    feature.set(measurementTypeProperty, this.type);
    return feature;
  }

  static getDefaultText(): Text {
    return getTextFromOptions({
      font: 'bold 18px Arial',
      textBaseline: 'bottom',
      offsetY: 0,
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
}

export default MeasurementMode;
