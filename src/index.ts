import type {
  VcsUiApp,
  VcsPlugin,
  WindowPosition,
  PluginConfigEditor,
} from '@vcmap/ui';
import { getDefaultProjection } from '@vcmap/core';
import { name, version, mapVersion } from '../package.json';
import { addToolButtons } from './util/toolbox.js';
import {
  createMeasurementManager,
  type MeasurementManager,
} from './measurementManager.js';
import addContextMenu from './util/context.js';
import { MeasurementType } from './mode/measurementMode.js';
import {
  getDefaultOptions,
  parseOptions,
  MapNames,
  type MeasurementConfig,
} from './util/configHelper.js';
import MeasurementConfigEditor from './windows/MeasurementConfigEditor.vue';

type MeasurementState = {
  active: boolean;
  windowPosition: WindowPosition;
};

export type MeasurementPlugin = VcsPlugin<
  MeasurementConfig,
  MeasurementState
> & {
  readonly config: Required<MeasurementConfig>;
  readonly manager: MeasurementManager;
};

export default function measurementPlugin(
  options: MeasurementConfig,
): MeasurementPlugin {
  let destroy = (): void => {};
  let measurementManager: MeasurementManager | undefined;
  const config = parseOptions(options);

  return {
    get name(): string {
      return name;
    },
    get version(): string {
      return version;
    },
    get mapVersion(): string {
      return mapVersion;
    },
    get config(): Required<MeasurementConfig> {
      return config;
    },
    get manager(): MeasurementManager {
      if (!measurementManager) {
        throw new Error('Measurement manager not yet initialized');
      }
      return measurementManager;
    },
    initialize(app: VcsUiApp): Promise<void> {
      const projectionListener = [
        app.moduleAdded.addEventListener(() => {
          measurementManager?.currentMeasurementMode.value?.setProjection(
            getDefaultProjection(),
          );
        }),
        app.moduleRemoved.addEventListener(() => {
          measurementManager?.currentMeasurementMode.value?.setProjection(
            getDefaultProjection(),
          );
        }),
      ];
      measurementManager = createMeasurementManager(app);
      const destroyButtons = addToolButtons(measurementManager, app);
      addContextMenu(app, measurementManager);

      destroy = (): void => {
        projectionListener.forEach((cb) => {
          cb();
        });
        destroyButtons();
        measurementManager?.destroy();
      };

      return Promise.resolve();
    },
    getDefaultOptions,
    toJSON(): MeasurementConfig {
      const serial: MeasurementConfig = {};
      const defaultOptions = getDefaultOptions();

      function ensureSerialHasMap(map: MapNames): void {
        if (!serial[map]) {
          Object.assign(serial, { [map]: {} });
        }
      }

      Object.values(MapNames).forEach((map) => {
        if (config[map].disable !== defaultOptions[map].disable) {
          ensureSerialHasMap(map);
          serial[map]!.disable = config[map].disable;
        }
        if (config[map].decimalPlaces !== defaultOptions[map].decimalPlaces) {
          ensureSerialHasMap(map);
          serial[map]!.decimalPlaces = config[map].decimalPlaces;
        }
      });
      ([MapNames.Cesium, MapNames.Oblique, MapNames.Panorama] as const).forEach(
        (map) => {
          if (
            config[map].decimalPlacesZ !== defaultOptions[map].decimalPlacesZ
          ) {
            ensureSerialHasMap(map);
            serial[map]!.decimalPlacesZ = config[map].decimalPlacesZ;
          }
        },
      );

      if (
        config[MapNames.Cesium].decimalPlacesAngle !==
        defaultOptions[MapNames.Cesium].decimalPlacesAngle
      ) {
        ensureSerialHasMap(MapNames.Cesium);
        serial[MapNames.Cesium]!.decimalPlacesAngle =
          config[MapNames.Cesium].decimalPlacesAngle;
      }
      return serial;
    },
    i18n: {
      en: {
        measurement: {
          header: {
            title: 'Temporary measurement',
          },
          create: {
            [MeasurementType.Position2D]: '2D-Point',
            [MeasurementType.Position3D]: '3D-Point',
            [MeasurementType.Distance2D]: '2D-Distance',
            [MeasurementType.Distance3D]: '3D-Distance',
            [MeasurementType.Area2D]: '2D-Area',
            [MeasurementType.Area3D]: '3D-Area',
            [MeasurementType.ObliqueHeight2D]: '2D-Height',
            [MeasurementType.Height3D]: '3D-Height',
            tooltip: {
              [MeasurementType.Position2D]: 'Measure 2D-Point',
              [MeasurementType.Position3D]: 'Measure 3D-Point',
              [MeasurementType.Distance2D]: 'Measure 2D-Distance',
              [MeasurementType.Distance3D]: 'Measure 3D-Distance',
              [MeasurementType.Area2D]: 'Measure 2D-Area',
              [MeasurementType.Area3D]: 'Measure 3D-Area',
              [MeasurementType.ObliqueHeight2D]: 'Measure 2D-Height',
              [MeasurementType.Height3D]: 'Measure 3D-Height',
            },
            noFeature: 'Click on the map to start measuring',
            failed: 'Failed to create a valid geometry for the measurement',
          },
          value: {
            point: 'Point',
            points: 'Measurement Points',
            distance: 'Distance',
            area: 'Area',
            circumference: 'Circumference',
            height: 'Height',
            groundPoint: 'Ground Point',
            heightPoint: 'Height Point',
            horizontalDistance: 'Horizontal Distance',
            beta: 'Beta',
            alpha: 'Alpha',
          },
          edit: 'Edit measurement',
          select: 'Select measurement',
          category: {
            title: 'Measurements',
            zoomTo: 'Zoom to',
            remove: 'Remove',
            removeSelected: 'Remove selection',
          },
          config: {
            title: 'Measurement Config Editor',
            decimalPlaces: 'Number of decimals',
            decimalPlacesZ: 'Number of altimetry decimals',
            decimalPlacesAngle: 'Number of angle decimals',
            disable: 'Disable measurements for this map',
            enable: 'Enable measurements for this map',
            errorInput: 'Input must be a positive number',
          },
          hint: {
            oblique: {
              distance:
                'Please notice that measurements only provide correct results if measured on the ground.',
              height:
                'Please notice that measurements only provide correct results if the start point is on the ground. Since the measurement depends on the local image coordinate system, it cannot be edited nor added to My Workspace.',
            },
          },
        },
      },
      de: {
        measurement: {
          header: {
            title: 'Temporäre Messung',
          },
          create: {
            [MeasurementType.Position2D]: '2D-Punkt',
            [MeasurementType.Position3D]: '3D-Punkt',
            [MeasurementType.Distance2D]: '2D-Distanz',
            [MeasurementType.Distance3D]: '3D-Distanz',
            [MeasurementType.Area2D]: '2D-Fläche',
            [MeasurementType.Area3D]: '3D-Fläche',
            [MeasurementType.ObliqueHeight2D]: '2D-Höhe',
            [MeasurementType.Height3D]: '3D-Höhe',
            tooltip: {
              [MeasurementType.Position2D]: '2D-Punkt messen',
              [MeasurementType.Position3D]: '3D-Punkt messen',
              [MeasurementType.Distance2D]: '2D-Distanz messen',
              [MeasurementType.Distance3D]: '3D-Distanz messen',
              [MeasurementType.Area2D]: '2D-Fläche messen',
              [MeasurementType.Area3D]: '3D-Fläche messen',
              [MeasurementType.ObliqueHeight2D]: '2D-Höhe messen',
              [MeasurementType.Height3D]: '3D-Höhe messen',
            },
            noFeature: 'Klicken Sie auf die Karte, um eine Messung zu starten',
            failed:
              'Es konnte keine gültige Geometrie für die Messung erstellt werden',
          },
          value: {
            point: 'Punkt',
            points: 'Messpunkte',
            distance: 'Distanz',
            area: 'Fläche',
            circumference: 'Umfang',
            height: 'Höhe',
            groundPoint: 'Bodenpunkt',
            heightPoint: 'Höhenpunkt',
            horizontalDistance: 'Horizontale Distanz',
            beta: 'Beta',
            alpha: 'Alpha',
          },
          edit: 'Messung editieren',
          select: 'Messung selektieren',
          category: {
            title: 'Messungen',
            zoomTo: 'Hin zoomen',
            remove: 'Entfernen',
            removeSelected: 'Selektion löschen',
          },
          config: {
            title: 'Messung Konfiguration',
            decimalPlaces: 'Anzahl der Dezimalstellen',
            decimalPlacesZ: 'Anzahl der Höhen-Dezimalstellen',
            decimalPlacesAngle: 'Anzahl der Winkeldezimalstellen',
            disable: 'Messung für diese Karte deaktivieren',
            enable: 'Messung für diese Karte aktivieren',
            errorInput: 'Eingabe muss eine positive Zahl sein',
          },
          hint: {
            oblique: {
              distance:
                'Bitte beachten Sie, dass Messungen nur dann korrekte Ergebnisse liefern, wenn sie auf dem Boden gemessen werden.',
              height:
                'Bitte beachten Sie, dass Messungen nur korrekte Ergebnisse liefern, wenn der Startpunkt der Messung auf einen Bodenpunkt gesetzt wird. Da die Messung vom lokalen Bildkoordinatensystem abhängt, kann sie weder bearbeitet noch zu meinem Arbeitsbereich hinzugefügt werden.',
            },
          },
        },
      },
    },
    getConfigEditors(): PluginConfigEditor<object>[] {
      return [
        {
          component: MeasurementConfigEditor,
          title: 'measurement.config.title',
        },
      ];
    },
    destroy(): void {
      destroy();
    },
  };
}
