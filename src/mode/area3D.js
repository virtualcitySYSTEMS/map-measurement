import {
  CesiumMap,
  defaultVectorStyle,
  GeometryType,
  getDefaultHighlightStyle,
  getFlatCoordinatesFromGeometry,
  Projection,
} from '@vcmap/core';
import { Polygon } from 'ol/geom.js';
import { Cartesian2, Cartesian3, PolygonPipeline } from '@vcmap-cesium/engine';
import { Style } from 'ol/style.js';
import MeasurementMode, {
  measurementModeSymbol,
  MeasurementType,
} from './measurementMode.js';

/** @type {Cesium/Cartesian3} */
let scratchAB = new Cartesian3();
/** @type {Cesium/Cartesian3} */
let scratchAC = new Cartesian3();

class Area3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Area3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.Polygon;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps() {
    return [CesiumMap.className];
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry();
    const coords = getFlatCoordinatesFromGeometry(geometry);

    const coordsLength = coords.length;
    const cartesian3Array = new Array(coordsLength);
    const cartesian2Array = new Array(coordsLength);
    let height = coords[0][2];
    let circumference = 0;
    let area = 0;

    for (let i = 0; i < coordsLength; i++) {
      height = coords[i][2] > height ? coords[i][2] : height;
      Projection.mercatorToWgs84(coords[i], true);
      cartesian3Array[i] = Cartesian3.fromDegrees(
        coords[i][0],
        coords[i][1],
        coords[i][2],
      );
      cartesian2Array[i] = Cartesian2.fromCartesian3(cartesian3Array[i]);
      if (i) {
        circumference += Cartesian3.distance(
          cartesian3Array[i - 1],
          cartesian3Array[i],
        );
      }
    }
    circumference += Cartesian3.distance(
      cartesian3Array[coordsLength - 1],
      cartesian3Array[0],
    );

    const triangles = PolygonPipeline.triangulate(cartesian2Array);
    const triangleLength = triangles.length;

    for (let j = 0; j < triangleLength; j += 3) {
      const indexA = triangles[j];
      const indexB = triangles[j + 1];
      const indexC = triangles[j + 2];
      scratchAB = Cartesian3.subtract(
        cartesian3Array[indexA],
        cartesian3Array[indexB],
        scratchAB,
      );
      scratchAC = Cartesian3.subtract(
        cartesian3Array[indexA],
        cartesian3Array[indexC],
        scratchAC,
      );
      scratchAB = Cartesian3.cross(scratchAB, scratchAC, scratchAB);
      area += Cartesian3.magnitude(scratchAB) / 2;
    }

    this.values.height = height;
    this.values.area = this.getValue(area, true);
    this.values.circumference = this.getValue(circumference);
    return Promise.resolve(true);
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Polygon([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
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
        const position = f.getGeometry().getInteriorPoint();
        const labelCoords = position.getCoordinates();
        labelCoords[2] = f[measurementModeSymbol].values.height;
        position.setCoordinates(labelCoords);
        return position;
      },
    });
    return (feature) => {
      text.setText(feature[measurementModeSymbol].values.area);
      return [defaultStyle, labelStyle];
    };
  }
}

export default Area3D;
