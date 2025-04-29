import {
  defaultVectorStyle,
  GeometryType,
  getDefaultHighlightStyle,
  getFlatCoordinateReferences,
  mercatorProjection,
  ObliqueMap,
  Projection,
  transformFromImage,
  wgs84Projection,
  CesiumMap,
  OpenlayersMap,
  alreadyTransformedToImage,
} from '@vcmap/core';
import type { VcsUiApp } from '@vcmap/ui';
import type Feature from 'ol/Feature.js';
import type { Coordinate } from 'ol/coordinate.js';
import { getDistance as haversineDistance } from 'ol/sphere.js';
import type { Geometry } from 'ol/geom.js';
import { LineString, Point } from 'ol/geom.js';
import { Style } from 'ol/style.js';
import type { MeasurementManager } from '../measurementManager.js';
import MeasurementMode, {
  getValues,
  MeasurementType,
} from './measurementMode.js';

type Distance2DOptions = {
  app: VcsUiApp;
  manager: MeasurementManager;
};

class Distance2D extends MeasurementMode {
  calcMeasurementResolve:
    | ((value: boolean | PromiseLike<boolean>) => void)
    | undefined;

  calcMeasurementTimeout: NodeJS.Timeout | undefined;

  constructor(options: Distance2DOptions) {
    super(options);
    this.calcMeasurementResolve = undefined;
    this.calcMeasurementTimeout = undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Distance2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.LineString;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (this.calcMeasurementTimeout) {
      clearTimeout(this.calcMeasurementTimeout);
      this.calcMeasurementTimeout = undefined;
      this.calcMeasurementResolve?.(false);
      this.calcMeasurementResolve = undefined;
    }

    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const map = this.app.maps.activeMap!;
      const geometry = feature.getGeometry()!;
      const coords = getFlatCoordinateReferences(geometry);

      if (geometry[alreadyTransformedToImage]) {
        this.calcMeasurementResolve = resolve;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.calcMeasurementTimeout = setTimeout(async () => {
          this.calcMeasurementResolve = undefined;
          this.calcMeasurementTimeout = undefined;
          const wgs84Coords = await Promise.all(
            coords.map((c) => {
              return transformFromImage((map as ObliqueMap).currentImage!, c, {
                dataProjection: wgs84Projection,
              }).then((res) => {
                return res.coords;
              });
            }),
          );

          const positions = [];
          for (let i = 0; i < wgs84Coords.length; i++) {
            const coordinate = Projection.transform(
              this.projection,
              wgs84Projection,
              wgs84Coords[i],
            );
            positions.push({
              id: (positions.length + 1).toString(),
              name: undefined,
              x: +coordinate[0].toFixed(this.crsDecimalPlaces),
              y: +coordinate[1].toFixed(this.crsDecimalPlaces),
              z: 0,
            });
          }
          this.values.value.vertexPositions = positions;
          this.values.value.distance = this.getValue(
            this.calculateDistance(wgs84Coords),
          );
          resolve(true);
        }, 30);
      } else {
        const positions = [];
        for (let i = 0; i < coords.length; i++) {
          const coordinate = Projection.transform(
            this.projection,
            mercatorProjection,
            coords[i],
          );
          positions.push({
            id: (positions.length + 1).toString(),
            name: undefined,
            x: +coordinate[0].toFixed(this.crsDecimalPlaces),
            y: +coordinate[1].toFixed(this.crsDecimalPlaces),
            z: 0,
          });
        }
        for (let i = 0; i < coords.length; i++) {
          Projection.mercatorToWgs84(coords[i], true);
        }

        this.values.value = {
          type: this.type,
          distance: this.getValue(this.calculateDistance(coords)),
          vertexPositions: positions,
        };
        resolve(true);
      }
    });
  }

  // eslint-disable-next-line class-methods-use-this
  calculateDistance(coordinates: Coordinate[]): number {
    const coordsLength = coordinates.length;
    const segmentDistance = new Array<number>(coordsLength - 1);
    let distance = 0;
    for (let i = 1; i < coordsLength; i++) {
      segmentDistance[i - 1] = haversineDistance(
        coordinates[i - 1],
        coordinates[i],
      );
      distance += segmentDistance[i - 1];
    }
    return distance;
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));
    return templateFeature;
  }

  static getStyleFunction(highlight: boolean): (feature: Feature) => Style[] {
    const defaultStyle = highlight
      ? getDefaultHighlightStyle()
      : (defaultVectorStyle.style as Style);
    const text = MeasurementMode.getDefaultText();
    const labelStyle = new Style({
      text,
      geometry: (f): Geometry => {
        const coords = (f.getGeometry() as Geometry).getCoordinates();
        if (coords.length > 1) {
          return new Point(coords[coords.length - 1]);
        }
        return f.getGeometry() as Geometry;
      },
    });
    return (feature) => {
      text.setText(getValues(feature)?.distance);
      return [defaultStyle, labelStyle];
    };
  }
}

export default Distance2D;
