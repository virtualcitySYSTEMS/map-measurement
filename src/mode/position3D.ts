import {
  CesiumMap,
  GeometryType,
  getFlatCoordinateReferences,
  mercatorProjection,
  Projection,
} from '@vcmap/core';
import Feature from 'ol/Feature.js';
import { Geometry, Point } from 'ol/geom.js';
import MeasurementMode, { MeasurementType } from './measurementMode.js';

class Position3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Position3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.Point;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry() as Geometry;
    const coords = getFlatCoordinateReferences(geometry);
    const point = Projection.transform(
      this.projection,
      mercatorProjection,
      coords[0],
    );
    const positions = [];
    positions.push({
      id: '',
      name: undefined,
      x: +point[0].toFixed(this.crsDecimalPlaces),
      y: +point[1].toFixed(this.crsDecimalPlaces),
      z: +point[2].toFixed(this.decimalPlaces),
    });
    this.values.value = { type: this.type, vertexPositions: positions };
    return Promise.resolve(true);
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Point([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
    return templateFeature;
  }
}

export default Position3D;
