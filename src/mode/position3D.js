import { GeometryType, getFlatCoordinatesFromGeometry } from '@vcmap/core';
import { Point } from 'ol/geom.js';
import { MeasurementType } from '../util/toolbox.js';
import MeasurementMode from './measurementMode.js';

class Position3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Position3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.Point;
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry();
    const coords = getFlatCoordinatesFromGeometry(geometry);
    const positions = [];
    positions.push({
      id: '',
      name: undefined,
      x: coords[0][0].toFixed(this.decimalPlaces),
      y: coords[0][1].toFixed(this.decimalPlaces),
      z: coords[0][2].toFixed(this.decimalPlaces),
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
