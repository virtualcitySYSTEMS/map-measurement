import {
  CesiumMap,
  defaultVectorStyle,
  GeometryType,
  getDefaultHighlightStyle,
  getFlatCoordinateReferences,
  Projection,
} from '@vcmap/core';
import { Cartesian2, Cartesian3, PolygonPipeline } from '@vcmap-cesium/engine';
import type Feature from 'ol/Feature.js';
import type { Geometry } from 'ol/geom.js';
import { Polygon } from 'ol/geom.js';
import { Style } from 'ol/style.js';
import MeasurementMode, {
  getValues,
  MeasurementType,
} from './measurementMode.js';

let scratchAB: Cartesian3 = new Cartesian3();
let scratchAC: Cartesian3 = new Cartesian3();

class Area3D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Area3D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.Polygon;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry()!;
    const coords = getFlatCoordinateReferences(geometry);

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

    this.values.value = {
      type: this.type,
      area: this.getValue(area, true),
      circumference: this.getValue(circumference),
      height: height.toString(),
    };
    return Promise.resolve(true);
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Polygon([]));
    templateFeature.set('olcs_altitudeMode', 'absolute');
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
        const position = (f.getGeometry() as Polygon).getInteriorPoint();
        const labelCoords = position.getCoordinates();
        labelCoords[2] = +(getValues(f as Feature)?.height ?? 0);
        position.setCoordinates(labelCoords);
        return position;
      },
    });
    return (feature) => {
      text.setText(getValues(feature)?.area);
      return [defaultStyle, labelStyle];
    };
  }
}

export default Area3D;
