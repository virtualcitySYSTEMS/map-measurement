import {
  defaultVectorStyle,
  GeometryType,
  getDefaultHighlightStyle,
  getFlatCoordinatesFromGeometry,
  mercatorProjection,
  ObliqueMap,
  Projection,
  transformFromImage,
  wgs84Projection,
  CesiumMap,
  OpenlayersMap,
  originalFeatureSymbol,
  alreadyTransformedToImage,
} from '@vcmap/core';
import { getDistance as haversineDistance } from 'ol/sphere.js';
import { LineString, Point } from 'ol/geom.js';
import { Style } from 'ol/style.js';
import MeasurementMode, {
  measurementModeSymbol,
  MeasurementType,
} from './measurementMode.js';

class Distance2D extends MeasurementMode {
  constructor(options) {
    super(options);
    this.calcMeasurementResolve = undefined;
    this.calcMeasurementTimeout = undefined;
  }

  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Distance2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.LineString;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps() {
    return [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className];
  }

  calcMeasurementResult(feature) {
    if (this.calcMeasurementTimeout) {
      clearTimeout(this.calcMeasurementTimeout);
      this.calcMeasurementTimeout = undefined;
      this.calcMeasurementResolve(false);
      this.calcMeasurementResolve = undefined;
    }

    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      const map = this.app.maps.activeMap;
      const geometry = feature.getGeometry();

      const coords = getFlatCoordinatesFromGeometry(geometry);

      if (geometry[alreadyTransformedToImage]) {
        this.calcMeasurementResolve = resolve;
        this.calcMeasurementTimeout = setTimeout(async () => {
          this.calcMeasurementResolve = undefined;
          this.calcMeasurementTimeout = undefined;
          const wgs84Coords = await Promise.all(
            coords.map((c) => {
              return transformFromImage(map.currentImage, c, {
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
              id: positions.length + 1,
              name: undefined,
              x: coordinate[0].toFixed(this.decimalPlaces),
              y: coordinate[1].toFixed(this.decimalPlaces),
              z: 0,
            });
          }
          this.values.vertexPositions = positions;
          this.values.distance = this.getValue(
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
            id: positions.length + 1,
            name: undefined,
            x: coordinate[0].toFixed(this.decimalPlaces),
            y: coordinate[1].toFixed(this.decimalPlaces),
            z: 0,
          });
        }
        for (let i = 0; i < coords.length; i++) {
          Projection.mercatorToWgs84(coords[i], true);
        }
        this.values.vertexPositions = positions;
        this.values.distance = this.getValue(this.calculateDistance(coords));
        resolve(true);
      }
    });
  }

  calculateDistance(coordinates) {
    const coordsLength = coordinates.length;
    this.segmentDistance = new Array(coordsLength - 1);
    let distance = 0;
    for (let i = 1; i < coordsLength; i++) {
      this.segmentDistance[i - 1] = haversineDistance(
        coordinates[i - 1],
        coordinates[i],
      );
      distance += this.segmentDistance[i - 1];
    }
    return distance;
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));
    return templateFeature;
  }

  static getStyleFunction(highlight) {
    const defaultStyle = highlight
      ? getDefaultHighlightStyle()
      : defaultVectorStyle.style;
    const text = MeasurementMode.getDefaultText();
    const labelStyle = new Style({
      text,
      geometry: (f) => {
        const coords = f.getGeometry().getCoordinates();
        if (coords.length > 1) {
          return new Point(coords[coords.length - 1]);
        }
        return f.getGeometry();
      },
    });
    return (feature) => {
      const featureToUse = feature[originalFeatureSymbol]
        ? feature[originalFeatureSymbol]
        : feature;
      text.setText(featureToUse[measurementModeSymbol]?.values.distance);
      return [defaultStyle, labelStyle];
    };
  }
}

export default Distance2D;
