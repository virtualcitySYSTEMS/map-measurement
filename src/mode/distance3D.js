import {
  GeometryType,
  getFlatCoordinatesFromGeometry,
  mercatorProjection,
  Projection,
} from '@vcmap/core';
import { LineString } from 'ol/geom';
import { Cartesian3 } from '@vcmap-cesium/engine';
import MeasurementMode from './measurementMode.js';
import { MeasurementType } from '../util/toolbox.js';

/**
 * @type {Cesium/Cartesian3}
 */
let startCartesian = new Cartesian3();

/**
 * @type {Cesium/Cartesian3}
 */
let endCartesian = new Cartesian3();

class Distance3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Distance3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.LineString;
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry();
    const coords = getFlatCoordinatesFromGeometry(geometry);

    const positions = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const coordinate = Projection.transform(
        this.projection,
        mercatorProjection,
        coords[i],
      );
      positions.push({
        id: positions.length + 1,
        name: undefined,
        x: coordinate[0].toFixed(this.decimalPlaces),
        y: coordinate[1].toFixed(this.decimalPlaces),
        z: coordinate[2].toFixed(this.decimalPlaces),
      });
    }

    let distance = 0;
    this.segmentDistance = new Array(coords.length - 1);
    Projection.mercatorToWgs84(coords[0], true);
    startCartesian = Cartesian3.fromDegrees(
      coords[0][0],
      coords[0][1],
      coords[0][2],
      undefined,
      startCartesian,
    );
    for (let i = 1; i < coords.length; i++) {
      Projection.mercatorToWgs84(coords[i], true);
      endCartesian = Cartesian3.fromDegrees(
        coords[i][0],
        coords[i][1],
        coords[i][2],
        undefined,
        endCartesian,
      );
      this.segmentDistance[i - 1] = Cartesian3.distance(
        startCartesian,
        endCartesian,
      );
      distance += this.segmentDistance[i - 1];
      startCartesian = Cartesian3.clone(endCartesian);
    }
    this.values.vertexPositions = positions;
    this.values.distance = this.getValue(distance);

    return Promise.resolve(true);
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
    return templateFeature;
  }
}

export default Distance3D;
