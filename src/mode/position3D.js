import {
  CesiumMap,
  GeometryType,
  getFlatCoordinatesFromGeometry,
  mercatorProjection,
  OpenlayersMap,
  Projection,
} from '@vcmap/core';
import { Point } from 'ol/geom.js';
import MeasurementMode, { MeasurementType } from './measurementMode.js';

class Position3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Position3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.Point;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps() {
    return [CesiumMap.className, OpenlayersMap.className];
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry();
    const coords = getFlatCoordinatesFromGeometry(geometry);
    const point = Projection.transform(
      this.projection,
      mercatorProjection,
      coords[0],
    );
    const positions = [];
    positions.push({
      id: '',
      name: undefined,
      x: point[0].toFixed(this.decimalPlaces),
      y: point[1].toFixed(this.decimalPlaces),
      z: point[2].toFixed(this.decimalPlaces),
    });
    this.values.vertexPositions = positions;
    return Promise.resolve(true);
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Point([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
    return templateFeature;
  }
}

export default Position3D;
