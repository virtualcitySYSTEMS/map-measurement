import {
  CesiumMap,
  GeometryType,
  getFlatCoordinatesFromGeometry,
  mercatorProjection,
  ObliqueMap,
  OpenlayersMap,
  originalFeatureSymbol,
  Projection,
  transformFromImage,
  wgs84Projection,
} from '@vcmap/core';
import { Point } from 'ol/geom.js';
import MeasurementMode, { MeasurementType } from './measurementMode.js';

class Position2D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Position2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.Point;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps() {
    return [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className];
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const map = this.app.maps.activeMap;
      const geometry =
        feature[originalFeatureSymbol]?.getGeometry() ?? feature.getGeometry();
      const coords = getFlatCoordinatesFromGeometry(geometry);

      if (map instanceof ObliqueMap) {
        this.calcMeasurementResolve = resolve;
        this.calcMeasurementTimeout = setTimeout(async () => {
          this.calcMeasurementResolve = undefined;
          this.calcMeasurementTimeout = undefined;
          const { coords: wgs84Coords } = await transformFromImage(
            map.currentImage,
            coords[0],
            {
              dataProjection: wgs84Projection,
            },
          );
          const point = Projection.transform(
            this.projection,
            wgs84Projection,
            wgs84Coords,
          );

          this.values.vertexPositions = [
            {
              id: '',
              name: undefined,
              x: point[0].toFixed(this.decimalPlaces),
              y: point[1].toFixed(this.decimalPlaces),
              z: point[2].toFixed(this.decimalPlaces),
            },
          ];
          resolve(true);
        }, 30);
      } else {
        const point = Projection.transform(
          this.projection,
          mercatorProjection,
          coords[0],
        );

        this.values.vertexPositions = [
          {
            id: '',
            name: undefined,
            x: point[0].toFixed(this.decimalPlaces),
            y: point[1].toFixed(this.decimalPlaces),
            z: point[2].toFixed(this.decimalPlaces),
          },
        ];
        resolve(true);
      }
    });
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Point([]));
    templateFeature.set('olcs_altitudeMode', 'clampToGround');
    return templateFeature;
  }
}

export default Position2D;
