import { VcsUiApp, VcsPlugin, WindowPosition } from '@vcmap/ui';
import { getDefaultProjection, moduleIdSymbol } from '@vcmap/core';

import { name, version, mapVersion } from '../package.json';
import { addToolButtons } from './util/toolbox.js';
import { createMeasurementManager } from './measurementManager.js';
import setupMeasurementResultWindow from './window/setup.js';
import setupKeyListeners from './util/keyListeners.js';
import addContextMenu from './util/context.js';
import SimpleMeasurementCategory, {
  createCategory,
} from './category/simpleCategory.js';
import { MeasurementType } from './mode/measurementMode.js';

type PluginState = {
  active: boolean;
  windowPosition: WindowPosition;
};
type PluginConfig = Record<never, never>;
type MeasurementPlugin = VcsPlugin<PluginConfig, PluginState> & {
  readonly config: PluginConfig;
};

export default function measurementPlugin(
  config: PluginConfig,
): MeasurementPlugin {
  let destroy = (): void => {};
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
    get config(): PluginConfig {
      return config;
    },
    async initialize(app: VcsUiApp): Promise<void> {
      const measurementManager = createMeasurementManager(app);

      app.categoryClassRegistry.registerClass(
        this[moduleIdSymbol],
        SimpleMeasurementCategory.className,
        SimpleMeasurementCategory,
      );

      const { categoryUiItem: collectionComponent, destroy: destroyCategory } =
        await createCategory(measurementManager, app);

      const projectionListener = [
        app.moduleAdded.addEventListener(() => {
          measurementManager.currentMeasurementMode.value?.setProjection(
            getDefaultProjection(),
          );
        }),
        app.moduleRemoved.addEventListener(() => {
          measurementManager.currentMeasurementMode.value?.setProjection(
            getDefaultProjection(),
          );
        }),
      ];

      const mapActivatedListener = app.maps.mapActivated.addEventListener(
        () => {
          const destroyButtons = addToolButtons(measurementManager, app);
          const { destroy: destroyMeasurementWindow } =
            setupMeasurementResultWindow(
              measurementManager,
              app,
              collectionComponent,
            );

          const destroyKeyListeners = setupKeyListeners(measurementManager);

          addContextMenu(app, measurementManager, this.name);
          destroy = (): void => {
            projectionListener.forEach((cb) => cb());
            destroyButtons();
            destroyMeasurementWindow();
            destroyCategory();
            destroyKeyListeners();
            measurementManager.destroy();
          };
          mapActivatedListener();
        },
      );
    },
    i18n: {
      en: {
        measurement: {
          header: {
            title: 'Measurement',
          },
          create: {
            new: 'New',
            [MeasurementType.Position2D]: '2D-Point',
            [MeasurementType.Position3D]: '3D-Point',
            [MeasurementType.Distance2D]: '2D-Distance',
            [MeasurementType.Distance3D]: '3D-Distance',
            [MeasurementType.Area2D]: '2D-Area',
            [MeasurementType.Area3D]: '3D-Area',
            [MeasurementType.ObliqueHeight2D]: '2D-Height',
            [MeasurementType.Height3D]: '3D-Height',
            tooltip: {
              addToWorkspace: 'Add to My Workspace',
              [MeasurementType.Position2D]: 'Measure 2D-Point',
              [MeasurementType.Position3D]: 'Measure 3D-Point',
              [MeasurementType.Distance2D]: 'Measure 2D-Distance',
              [MeasurementType.Distance3D]: 'Measure 3D-Distance',
              [MeasurementType.Area2D]: 'Measure 2D-Area',
              [MeasurementType.Area3D]: 'Measure 3D-Area',
              [MeasurementType.ObliqueHeight2D]: 'Measure 2D-Height',
              [MeasurementType.Height3D]: 'Measure 3D-Height',
            },
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
          select: 'Select measurements',
          category: {
            title: 'Measurements',
            selectAll: 'Select all',
            hideSelected: 'Hide measurements',
            hideAll: 'Hide all',
            showAll: 'Show all',
            zoomTo: 'Zoom to',
            rename: 'Rename',
            edit: 'Edit',
            remove: 'Remove',
            removeSelected: 'Remove selection',
            exportSelected: 'Export selection',
            import: 'Import',
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
            title: 'Messen',
          },
          create: {
            new: 'Neu',
            [MeasurementType.Position2D]: '2D-Punkt',
            [MeasurementType.Position3D]: '3D-Punkt',
            [MeasurementType.Distance2D]: '2D-Distanz',
            [MeasurementType.Distance3D]: '3D-Distanz',
            [MeasurementType.Area2D]: '2D-Fläche',
            [MeasurementType.Area3D]: '3D-Fläche',
            [MeasurementType.ObliqueHeight2D]: '2D-Höhe',
            [MeasurementType.Height3D]: '3D-Höhe',
            tooltip: {
              addToWorkspace: 'In Mein Arbeitsbereich hinzufügen',
              [MeasurementType.Position2D]: '2D-Punkt messen',
              [MeasurementType.Position3D]: '3D-Punkt messen',
              [MeasurementType.Distance2D]: '2D-Distanz messen',
              [MeasurementType.Distance3D]: '3D-Distanz messen',
              [MeasurementType.Area2D]: '2D-Fläche messen',
              [MeasurementType.Area3D]: '3D-Fläche messen',
              [MeasurementType.ObliqueHeight2D]: '2D-Höhe messen',
              [MeasurementType.Height3D]: '3D-Höhe messen',
            },
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
          select: 'Messungen',
          category: {
            title: 'Messungen',
            selectAll: 'Alle selektieren',
            hideSelected: 'Selektierte Messungen ausblenden',
            hideAll: 'Alle ausblenden',
            showAll: 'Alle einblenden',
            zoomTo: 'Hin zoomen',
            rename: 'Umbenennen',
            edit: 'Editieren',
            remove: 'Entfernen',
            removeSelected: 'Selektion löschen',
            exportSelected: 'Selektion exportieren',
            import: 'Importieren',
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
    destroy(): void {
      destroy();
    },
  };
}
