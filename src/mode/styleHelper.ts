import {
  defaultVectorStyle,
  getDefaultHighlightStyle,
  originalFeatureSymbol,
} from '@vcmap/core';
import Feature, { FeatureLike } from 'ol/Feature.js';
import { Style } from 'ol/style.js';
import { measurementModeSymbol, MeasurementType } from './measurementMode.js';
import Distance2D from './distance2D.js';
import Area2D from './area2D.js';
import Area3D from './area3D.js';
import Height3D from './height3D.js';
import ObliqueHeight from './obliqueHeight.js';

export default function getMeasurementStyleFunction(
  highlight: boolean,
): (featureLike: FeatureLike) => Style[] {
  const distanceFunction = Distance2D.getStyleFunction(highlight);
  const area2DFunction = Area2D.getStyleFunction(highlight);
  const area3DFunction = Area3D.getStyleFunction(highlight);
  const height3DFunction = Height3D.getStyleFunction(highlight);
  const obliqueHeightFunction = ObliqueHeight.getStyleFunction(highlight);
  const defaultStyle = highlight
    ? getDefaultHighlightStyle()
    : (defaultVectorStyle.style as Style);

  return (featureLike) => {
    const feature = featureLike as Feature;
    const featureToCheck = feature[originalFeatureSymbol]
      ? feature[originalFeatureSymbol]
      : feature;

    if (featureToCheck[measurementModeSymbol]) {
      if (
        featureToCheck[measurementModeSymbol].type ===
        MeasurementType.Distance2D
      ) {
        return distanceFunction(feature);
      } else if (
        featureToCheck[measurementModeSymbol].type ===
        MeasurementType.Distance3D
      ) {
        return distanceFunction(feature);
      } else if (
        featureToCheck[measurementModeSymbol].type === MeasurementType.Area2D
      ) {
        return area2DFunction(feature);
      } else if (
        featureToCheck[measurementModeSymbol].type === MeasurementType.Area3D
      ) {
        return area3DFunction(feature);
      } else if (
        featureToCheck[measurementModeSymbol].type === MeasurementType.Height3D
      ) {
        return height3DFunction(feature);
      } else if (
        featureToCheck[measurementModeSymbol].type ===
        MeasurementType.ObliqueHeight2D
      ) {
        return obliqueHeightFunction(feature);
      }
    }
    return [defaultStyle];
  };
}
