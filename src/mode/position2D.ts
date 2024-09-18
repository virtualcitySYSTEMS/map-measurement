import {
  CesiumMap,
  GeometryType,
  getFlatCoordinateReferences,
  mercatorProjection,
  ObliqueMap,
  OpenlayersMap,
  originalFeatureSymbol,
  Projection,
  transformFromImage,
  wgs84Projection,
} from '@vcmap/core';
import Feature from 'ol/Feature.js';
import { Geometry, Point } from 'ol/geom.js';
import MeasurementMode, { MeasurementType } from './measurementMode.js';

class Position2D extends MeasurementMode {
  calcMeasurementResolve:
    | ((value: boolean | PromiseLike<boolean>) => void)
    | undefined;

  calcMeasurementTimeout: NodeJS.Timeout | undefined;

  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Position2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.Point;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const map = this.app.maps.activeMap;
      const geometry = (feature[originalFeatureSymbol]?.getGeometry() ??
        feature.getGeometry()) as Geometry;
      const coords = getFlatCoordinateReferences(geometry);

      if (map instanceof ObliqueMap) {
        this.calcMeasurementResolve = resolve;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.calcMeasurementTimeout = setTimeout(async () => {
          this.calcMeasurementResolve = undefined;
          this.calcMeasurementTimeout = undefined;
          const { coords: wgs84Coords } = await transformFromImage(
            map.currentImage!,
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

          this.values.value = {
            type: this.type,
            vertexPositions: [
              {
                id: '',
                name: undefined,
                x: +point[0].toFixed(this.decimalPlaces),
                y: +point[1].toFixed(this.decimalPlaces),
                z: +point[2].toFixed(this.decimalPlaces),
              },
            ],
          };
          resolve(true);
        }, 30);
      } else {
        const point = Projection.transform(
          this.projection,
          mercatorProjection,
          coords[0],
        );

        this.values.value = {
          type: this.type,
          vertexPositions: [
            {
              id: '',
              name: undefined,
              x: +point[0].toFixed(this.decimalPlaces),
              y: +point[1].toFixed(this.decimalPlaces),
              z:
                geometry.getLayout() === 'XY'
                  ? undefined
                  : +point[2].toFixed(this.decimalPlaces),
            },
          ],
        };
        resolve(true);
      }
    });
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Point([]));
    templateFeature.set('olcs_altitudeMode', 'clampToGround');
    return templateFeature;
  }
}

export default Position2D;
