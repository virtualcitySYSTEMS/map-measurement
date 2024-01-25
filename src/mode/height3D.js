import { defaultVectorStyle, GeometryType, Projection } from '@vcmap/core';
import { LineString, Point } from 'ol/geom.js';
import { Cartesian3, Math as CesiumMath } from '@vcmap-cesium/engine';
import { Fill, Stroke, Style } from 'ol/style.js';
import CircleStyle from 'ol/style/Circle.js';
import { MeasurementType } from '../util/toolbox.js';
import MeasurementMode from './measurementMode.js';

const cartesianMap = [
  { key: 'height', indices: [0, 1] },
  { key: 'horizontal', indices: [1, 2] },
  { key: 'distance', indices: [0, 2] },
];

class Height3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Height3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.LineString;
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const coords = feature.getGeometry().getCoordinates();

    if (
      coords.length === 3 &&
      this.manager.currentSession.value?.type === 'create'
    ) {
      this.manager.currentSession.value.finish();
      return Promise.resolve(false);
    }

    const cartesians = [new Cartesian3(), new Cartesian3(), new Cartesian3()];

    if (coords.length === 2) {
      const lowerPoint = coords[0][2] < coords[1][2] ? 0 : 1;
      const thirdPoint = coords[lowerPoint].slice();
      thirdPoint[2] = coords[lowerPoint ? 0 : 1][2];
      const triangle = [
        coords[lowerPoint],
        thirdPoint,
        coords[lowerPoint ? 0 : 1],
      ];

      for (let i = 0; i < 3; i++) {
        Projection.mercatorToWgs84(triangle[i], true);
        Cartesian3.fromDegrees(
          triangle[i][0],
          triangle[i][1],
          triangle[i][2],
          undefined,
          cartesians[i],
        );
      }

      const scratchValues = {
        horizontal: 0,
        height: 0,
        distance: 0,
      };

      for (let i = 0; i < 3; i++) {
        const { key, indices } = cartesianMap[i];
        const val = Cartesian3.distance(
          cartesians[indices[0]],
          cartesians[indices[1]],
        );
        scratchValues[key] = val;
        this.values[key] = this.getValue(val);
      }

      const alpha = CesiumMath.toDegrees(
        Math.asin(scratchValues.horizontal / scratchValues.distance),
      );
      const beta = 90 - alpha;
      this.values.alpha = `${alpha.toFixed(this.decimalPlaces)}°`;
      this.values.beta = `${beta.toFixed(this.decimalPlaces)}°`;
      this.values.groundAltitude = this.getValue(coords[lowerPoint][2]);
      this.values.heightAltitude = this.getValue(thirdPoint[2]);
    }
    return Promise.resolve(true);
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');

    const triangleStyle = new Style({
      stroke: new Stroke({ color: '#09465e', width: 3 }),
      image: new CircleStyle({
        fill: new Fill({ color: '#09465e' }),
        radius: 5,
      }),
      geometry: (f) => {
        const coords = f.getGeometry().getCoordinates();
        if (coords.length === 2) {
          const lowerPoint =
            coords[0][2] < coords[1][2] ? coords[0] : coords[1];
          const upperPoint =
            coords[0][2] < coords[1][2] ? coords[1] : coords[0];
          return new LineString([
            lowerPoint,
            upperPoint,
            [lowerPoint[0], lowerPoint[1], upperPoint[2]],
            lowerPoint,
          ]);
        }
        return f.getGeometry();
      },
    });

    const heightStyleText = MeasurementMode.getDefaultText();
    const heightStyle = new Style({
      text: heightStyleText,
      geometry: (f) => {
        const coords = f.getGeometry().getCoordinates();
        if (coords.length === 2) {
          const position = coords[0][2] < coords[1][2] ? coords[0] : coords[1];
          position[2] = (coords[0][2] + coords[1][2]) * 0.5;
          return new Point(position);
        }
        return f.getGeometry();
      },
    });

    const horizontalStyleText = MeasurementMode.getDefaultText();
    const horizontalStyle = new Style({
      text: horizontalStyleText,
      geometry: (f) => {
        const coords = f.getGeometry().getCoordinates();
        if (coords.length === 2) {
          const height = Math.max(coords[0][2], coords[1][2]);
          return new Point([
            (coords[0][0] + coords[1][0]) * 0.5,
            (coords[0][1] + coords[1][1]) * 0.5,
            height,
          ]);
        }
        return f.getGeometry();
      },
    });

    const distanceStyleText = MeasurementMode.getDefaultText();
    const distanceStyle = new Style({
      text: distanceStyleText,
      geometry: (f) => {
        const coords = f.getGeometry().getCoordinates();
        if (coords.length === 2) {
          return new Point([
            (coords[0][0] + coords[1][0]) * 0.5,
            (coords[0][1] + coords[1][1]) * 0.5,
            (coords[0][2] + coords[1][2]) * 0.5,
          ]);
        }
        return f.getGeometry();
      },
    });

    const height3DStyleFunction = () => {
      heightStyleText.setText(this.values.height);
      horizontalStyleText.setText(this.values.horizontal);
      distanceStyleText.setText(this.values.distance);
      return [
        defaultVectorStyle.style,
        triangleStyle,
        heightStyle,
        horizontalStyle,
        distanceStyle,
      ];
    };
    templateFeature.setStyle(height3DStyleFunction);

    return templateFeature;
  }
}

export default Height3D;
