export enum MapNames {
  OpenLayers = 'OpenlayersMap',
  Oblique = 'ObliqueMap',
  Cesium = 'CesiumMap',
  Panorama = 'PanoramaMap',
}

export type MeasurementConfig = {
  [MapNames.OpenLayers]?: {
    disable: boolean;
    decimalPlaces: number;
  };
  [MapNames.Oblique]?: {
    disable: boolean;
    decimalPlaces: number;
    decimalPlacesZ?: number;
  };
  [MapNames.Cesium]?: {
    disable: boolean;
    decimalPlaces: number;
    decimalPlacesAngle: number;
    decimalPlacesZ?: number;
  };
  [MapNames.Panorama]?: {
    disable: boolean;
    decimalPlaces: number;
    decimalPlacesAngle: number;
    decimalPlacesZ?: number;
  };
};

export function getDefaultOptions(): Required<MeasurementConfig> {
  return {
    [MapNames.OpenLayers]: {
      disable: false,
      decimalPlaces: 2,
    },
    [MapNames.Cesium]: {
      disable: false,
      decimalPlaces: 2,
      decimalPlacesAngle: 3,
    },
    [MapNames.Oblique]: {
      disable: false,
      decimalPlaces: 2,
    },
    [MapNames.Panorama]: {
      disable: false,
      decimalPlaces: 2,
      decimalPlacesAngle: 3,
    },
  };
}

export function parseOptions(
  options: Partial<MeasurementConfig>,
): Required<MeasurementConfig> {
  const defaultOptions = getDefaultOptions();
  const parsedConfig: Required<MeasurementConfig> = {
    [MapNames.OpenLayers]: {
      ...defaultOptions[MapNames.OpenLayers],
      ...options[MapNames.OpenLayers],
    },
    [MapNames.Cesium]: {
      ...defaultOptions[MapNames.Cesium],
      ...options[MapNames.Cesium],
    },
    [MapNames.Oblique]: {
      ...defaultOptions[MapNames.Oblique],
      ...options[MapNames.Oblique],
    },
    [MapNames.Panorama]: {
      ...defaultOptions[MapNames.Panorama],
      ...options[MapNames.Panorama],
    },
  };
  return parsedConfig;
}
