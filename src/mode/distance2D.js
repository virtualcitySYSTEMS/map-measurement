import {
  defaultVectorStyle,
  GeometryType,
  getFlatCoordinatesFromGeometry,
  obliqueGeometry,
  ObliqueMap,
  Projection,
  transformFromImage,
  wgs84Projection,
} from '@vcmap/core';
import { getDistance as haversineDistance } from 'ol/sphere.js';
import { LineString, Point } from 'ol/geom.js';
import { Style } from 'ol/style.js';
import { MeasurementType } from '../util/toolbox.js';
import MeasurementMode from './measurementMode.js';

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
      const geometry =
        map instanceof ObliqueMap
          ? feature[obliqueGeometry]
          : feature.getGeometry();
      const coords = getFlatCoordinatesFromGeometry(geometry);
      const positions = [];
      for (let i = 0; i < coords.length; i++) {
        const coordinate = coords[i];
        positions.push({
          id: positions.length + 1,
          name: undefined,
          x: coordinate[0].toFixed(this.decimalPlaces),
          y: coordinate[1].toFixed(this.decimalPlaces),
          z: 0,
        });
      }
      if (map instanceof ObliqueMap) {
        this.calcMeasurementResolve = resolve;
        this.calcMeasurementTimeout = setTimeout(async () => {
          this.calcMeasurementResolve = undefined;
          this.calcMeasurementTimeout = undefined;
          const wgs84Coords = new Array(coords.length);
          const promises = coords.map((c, i) => {
            return transformFromImage(map.currentImage, c, {
              dataProjection: wgs84Projection,
            }).then((res) => {
              wgs84Coords[i] = res.coords;
            });
          });
          await Promise.all(promises);
          this.values.vertexPositions = positions;
          this.values.distance = this.getValue(
            this.calculateDistance(wgs84Coords),
          );
          resolve(true);
        }, 30);
      } else {
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
    const distance2DStyleFunction = () => {
      text.setText(this.values.distance);
      return [defaultVectorStyle.style, labelStyle];
    };
    templateFeature.setStyle(distance2DStyleFunction);
    return templateFeature;
  }
}

export default Distance2D;
