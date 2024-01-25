import {
  defaultVectorStyle,
  GeometryType,
  getFlatCoordinatesFromGeometry,
  Projection,
} from '@vcmap/core';
import { Polygon } from 'ol/geom.js';
import {
  getDistance as haversineDistance,
  getArea as geodesicArea,
} from 'ol/sphere.js';
import { Style } from 'ol/style.js';
import { MeasurementType } from '../util/toolbox.js';
import MeasurementMode from './measurementMode.js';

class Area2D extends MeasurementMode {
  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.Area2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.Polygon;
  }

  calcMeasurementResult(feature) {
    if (!this.check(feature)) {
      return Promise.resolve(false);
    }

    const geometry = feature.getGeometry();
    const coords = getFlatCoordinatesFromGeometry(geometry);

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

    this.values.circumference = this.getValue(circumference);
    this.values.area = this.getValue(geodesicArea(geometry), true);
    return Promise.resolve(true);
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new Polygon([]));

    const text = MeasurementMode.getDefaultText();
    const labelStyle = new Style({
      text,
      geometry: (f) => {
        return f.getGeometry().getInteriorPoint();
      },
    });

    const area2DStyleFunction = () => {
      text.setText(this.values.area);
      return [defaultVectorStyle.style, labelStyle];
    };
    templateFeature.setStyle(area2DStyleFunction);
    return templateFeature;
  }
}

export default Area2D;
