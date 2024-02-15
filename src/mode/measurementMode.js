import { Feature } from 'ol';
import {
  CesiumMap,
  GeometryType,
  getDefaultProjection,
  getTextFromOptions,
  ObliqueMap,
  OpenlayersMap,
  originalFeatureSymbol,
} from '@vcmap/core';

/**
 * @typedef {Object} MeasurementValues
 * @property {MeasurementType} type
 * @property {string|undefined} area
 * @property {string|undefined} circumference
 * @property {string|undefined} distance
 * @property {string|undefined} height
 * @property {string|undefined} alpha - angle in vertical measurement
 * @property {string|undefined} beta - angle in vertical measurement
 * @property {string|undefined} horizontal - horizontal distance in vertical measurement
 * @property {PositionValue|undefined} pointPosition - point measurement coordinates
 * @property {Array<PositionValue>} vertexPositions - positions of distance measurement coordinates
 * @api
 */

/**
 * @typedef {Object} PositionValue
 * @property {string|undefined} id
 * @property {string|undefined} name
 * @property {number|undefined} x - point measurement coordinates
 * @property {number|undefined} y - point measurement coordinates
 * @property {number|undefined} z - point measurement coordinates
 * @api
 */

/**
 * @type {symbol}
 */
export const measurementModeSymbol = Symbol('measurementModeSymbol');

/**
 * @type {string}
 */
export const measurementTypeProperty = 'vcs_measurement_type';

export const MeasurementType = {
  Position3D: 'Position3D',
  Distance2D: 'Distance2D',
  Area2D: 'Area2D',
  Distance3D: 'Distance3D',
  Area3D: 'Area3D',
  Height3D: 'Height3D',
  ObliqueHeight2D: 'ObliqueHeight2D',
};

export const MeasurementGeometryType = {
  [MeasurementType.Position3D]: GeometryType.Point,
  [MeasurementType.Distance2D]: GeometryType.LineString,
  [MeasurementType.Area2D]: GeometryType.Polygon,
  [MeasurementType.Distance3D]: GeometryType.LineString,
  [MeasurementType.Area3D]: GeometryType.Polygon,
  [MeasurementType.Height3D]: GeometryType.LineString,
  [MeasurementType.ObliqueHeight2D]: GeometryType.LineString,
};

export function getValues(feature) {
  if (feature[measurementModeSymbol]) {
    return feature[measurementModeSymbol].values;
  }
  return feature[originalFeatureSymbol]?.[measurementModeSymbol]?.values;
}

export function isSupportedMeasurement(feature, map) {
  const supportedMaps =
    feature[measurementModeSymbol]?.supportedMaps ??
    feature[originalFeatureSymbol]?.[measurementModeSymbol]?.supportedMaps ??
    [];
  return supportedMaps.includes(map.className);
}

class MeasurementMode {
  constructor(options) {
    this.app = options.app;
    this.manager = options.manager;
    this.projection = getDefaultProjection();
    this.decimalPlaces = 2;
    this.templateFeature = this.createTemplateFeature();
    this.values = this.defaultValues;
  }

  get defaultValues() {
    return {
      type: this.type,
      area: 0,
      circumference: 0,
      distance: 0,
      height: 0,
      alpha: 0,
      beta: 0,
      horizontal: 0,
      pointPosition: undefined,
      vertexPositions: [],
    };
  }

  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Area2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.Polygon;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps() {
    return [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className];
  }

  /**
   * @param {number} value
   * @param {boolean=} [square=false]
   * @returns {string}
   */
  getValue(value, square) {
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
  check(feature) {
    const geometry = feature.getGeometry();
    if (!geometry) {
      return false;
    }

    if (geometry.getCoordinates().length === 0) {
      return false;
    }

    return true;
  }

  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  calcMeasurementResult(feature) {}

  // eslint-disable-next-line class-methods-use-this
  createTemplateFeature() {
    const feature = new Feature();
    feature.set(measurementTypeProperty, this.type);
    return feature;
  }

  static getDefaultText() {
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
