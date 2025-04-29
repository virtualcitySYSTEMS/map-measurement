import {
  CesiumMap,
  defaultVectorStyle,
  GeometryType,
  getDefaultHighlightStyle,
  getFlatCoordinateReferences,
  OpenlayersMap,
  Projection,
} from '@vcmap/core';
import type Feature from 'ol/Feature.js';
import type { Geometry } from 'ol/geom.js';
import { Polygon } from 'ol/geom.js';
import {
  getDistance as haversineDistance,
  getArea as geodesicArea,
} from 'ol/sphere.js';
import { Style } from 'ol/style.js';
import MeasurementMode, {
  getValues,
  MeasurementType,
} from './measurementMode.js';

class Area2D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type(): MeasurementType {
    return MeasurementType.Area2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType(): GeometryType {
    return GeometryType.Polygon;
  }

  // eslint-disable-next-line class-methods-use-this
  get supportedMaps(): string[] {
    return [CesiumMap.className, OpenlayersMap.className];
  }

  calcMeasurementResult(feature: Feature): Promise<boolean> {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry()!;
    const coords = getFlatCoordinateReferences(geometry);

    let circumference = 0;
    for (let i = 0; i < coords.length; i++) {
      Projection.mercatorToWgs84(coords[i], true);
      if (i) {
        circumference += haversineDistance(coords[i - 1], coords[i]);
      }
      if (i === coords.length - 1) {
        circumference += haversineDistance(coords[i], coords[0]);
      }
    }

    this.values.value = {
      type: this.type,
      area: this.getValue(geodesicArea(geometry), true),
      circumference: this.getValue(circumference),
    };
    return Promise.resolve(true);
  }

  createTemplateFeature(): Feature {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Polygon([]));
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
        return (f.getGeometry() as Polygon).getInteriorPoint();
      },
    });
    return (feature) => {
      text.setText(getValues(feature)?.area);
      return [defaultStyle, labelStyle];
    };
  }
}

export default Area2D;
