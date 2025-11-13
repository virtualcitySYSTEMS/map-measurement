import {
  CesiumMap,
  GeometryType,
  getFlatCoordinateReferences,
  mercatorProjection,
  PanoramaMap,
  Projection,
} from '@vcmap/core';
import { Cartesian3 } from '@vcmap-cesium/engine';
import { LineString } from 'ol/geom';
import type Feature from 'ol/Feature.js';
import MeasurementMode, { MeasurementType } from './measurementMode.js';

let startCartesian: Cartesian3 = new Cartesian3();
let endCartesian: Cartesian3 = new Cartesian3();

class Distance3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Distance3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.LineString;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className, PanoramaMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry()!;
    const coords = getFlatCoordinateReferences(geometry);

    const positions = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const coordinate = Projection.transform(
        this.projection,
        mercatorProjection,
        coords[i],
      );
      positions.push({
        id: (positions.length + 1).toString(),
        name: undefined,
        x: +coordinate[0].toFixed(this.decimalPlaces),
        y: +coordinate[1].toFixed(this.decimalPlaces),
        z: +coordinate[2].toFixed(this.decimalPlacesZ),
      });
    }

    let distance = 0;
    const segmentDistance = new Array<number>(coords.length - 1);
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
      segmentDistance[i - 1] = Cartesian3.distance(
        startCartesian,
        endCartesian,
      );
      distance += segmentDistance[i - 1];
      startCartesian = Cartesian3.clone(endCartesian);
    }

    this.values.value = {
      type: this.type,
      distance: this.getValue(distance),
      vertexPositions: positions,
    };
    return Promise.resolve(true);
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
    return templateFeature;
  }
}

export default Distance3D;
