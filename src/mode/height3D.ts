import type { CreateFeatureSession } from '@vcmap/core';
import {
  CesiumMap,
  defaultVectorStyle,
  GeometryType,
  getDefaultHighlightStyle,
  Projection,
  SessionType,
} from '@vcmap/core';
import { Cartesian3, Math as CesiumMath } from '@vcmap-cesium/engine';
import type { Geometry } from 'ol/geom.js';
import { LineString, Point } from 'ol/geom.js';
import type { Coordinate } from 'ol/coordinate.js';
import type Feature from 'ol/Feature.js';
import { Style } from 'ol/style.js';
import MeasurementMode, {
  getValues,
  MeasurementType,
} from './measurementMode.js';

const cartesianMap = [
  { key: 'height', indices: [0, 1] },
  { key: 'horizontal', indices: [1, 2] },
  { key: 'distance', indices: [0, 2] },
];

class Height3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Height3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.LineString;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const coords: Coordinate[] = feature.getGeometry()!.getCoordinates();

    if (
      coords.length === 3 &&
      this.manager.currentSession.value?.type === SessionType.CREATE
    ) {
      (
        this.manager.currentSession
          .value as CreateFeatureSession<GeometryType.LineString>
      ).finish();
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

      const scratchValues: Record<string, number> = {
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
        // eslint-disable-next-line
        // @ts-ignore
        this.values.value[key] = this.getValue(val, false, key === 'height');
      }

      const alpha = CesiumMath.toDegrees(
        Math.asin(scratchValues.horizontal / scratchValues.distance),
      );
      const beta = 90 - alpha;

      this.values.value = {
        ...this.values.value,
        alpha: `${alpha.toFixed(this.decimalPlacesAngle)}°`,
        beta: `${beta.toFixed(this.decimalPlacesAngle)}°`,
        groundAltitude: this.getValue(coords[lowerPoint][2], false, true),
        heightAltitude: this.getValue(thirdPoint[2], false, true),
      };
    }
    return Promise.resolve(true);
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
    return templateFeature;
  }

  static getStyleFunction(highlight: boolean): (feature: Feature) => Style[] {
    const defaultStyle = highlight
      ? getDefaultHighlightStyle()
      : (defaultVectorStyle.style as Style);
    const triangleStyle = new Style({
      stroke: defaultStyle.getStroke() ?? undefined,
      geometry: (f): Geometry => {
        const coords: Coordinate[] = (
          f.getGeometry() as Geometry
        ).getCoordinates();
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
        return f.getGeometry() as Geometry;
      },
    });

    const heightStyleText = MeasurementMode.getDefaultText();
    const heightStyle = new Style({
      text: heightStyleText,
      geometry: (f): Geometry => {
        const coords: Coordinate[] = (
          f.getGeometry() as Geometry
        ).getCoordinates();
        if (coords.length === 2) {
          const position = coords[0][2] < coords[1][2] ? coords[0] : coords[1];
          position[2] = (coords[0][2] + coords[1][2]) * 0.5;
          return new Point(position);
        }
        return f.getGeometry() as Geometry;
      },
    });

    const horizontalStyleText = MeasurementMode.getDefaultText();
    const horizontalStyle = new Style({
      text: horizontalStyleText,
      geometry: (f): Geometry => {
        const coords: Coordinate[] = (
          f.getGeometry() as Geometry
        ).getCoordinates();
        if (coords.length === 2) {
          const height = Math.max(coords[0][2], coords[1][2]);
          return new Point([
            (coords[0][0] + coords[1][0]) * 0.5,
            (coords[0][1] + coords[1][1]) * 0.5,
            height,
          ]);
        }
        return f.getGeometry() as Geometry;
      },
    });

    const distanceStyleText = MeasurementMode.getDefaultText();
    const distanceStyle = new Style({
      text: distanceStyleText,
      geometry: (f): Geometry => {
        const coords: Coordinate[] = (
          f.getGeometry() as Geometry
        ).getCoordinates();
        if (coords.length === 2) {
          return new Point([
            (coords[0][0] + coords[1][0]) * 0.5,
            (coords[0][1] + coords[1][1]) * 0.5,
            (coords[0][2] + coords[1][2]) * 0.5,
          ]);
        }
        return f.getGeometry() as Geometry;
      },
    });

    return (feature) => {
      heightStyleText.setText(getValues(feature)?.height);
      horizontalStyleText.setText(getValues(feature)?.horizontal);
      distanceStyleText.setText(getValues(feature)?.distance);
      return [triangleStyle, heightStyle, horizontalStyle, distanceStyle];
    };
  }
}

export default Height3D;
