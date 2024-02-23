import { moduleIdSymbol } from '@vcmap/core';

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

/**
 * @typedef {Object} PluginState
 * @property {import("@vcmap/ui").WindowPositionOptions} [windowPosition]
 * @property {boolean} active
 */

/**
 * @param {PluginConfig} config - the configuration of this plugin instance, passed in from the app.
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<PluginConfig, PluginState>}
 */
export default function measurementPlugin(config) {
  // eslint-disable-next-line no-console
  return {
    get name() {
      return name;
    },
    get version() {
      return version;
    },
    get mapVersion() {
      return mapVersion;
    },
    get config() {
      return config;
    },
    _destroy: () => {},
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     */
    async initialize(vcsUiApp) {
      this._measurementManager = createMeasurementManager(vcsUiApp);

      vcsUiApp.categoryClassRegistry.registerClass(
        this[moduleIdSymbol],
        SimpleMeasurementCategory.className,
        SimpleMeasurementCategory,
      );

      const { categoryUiItem: collectionComponent, destroy: destroyCategory } =
        await createCategory(this._measurementManager, vcsUiApp);

      const destroyButtons = addToolButtons(this._measurementManager, vcsUiApp);
      const { destroy: destroyMeasurementWindow } =
        setupMeasurementResultWindow(
          this._measurementManager,
          vcsUiApp,
          collectionComponent,
        );

      const destroyKeyListeners = setupKeyListeners(this._measurementManager);

      addContextMenu(vcsUiApp, this._measurementManager, this.name);
      this._destroy = () => {
        destroyButtons();
        destroyMeasurementWindow();
        destroyCategory();
        destroyKeyListeners();
      };
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
                'Please notice that measurements only provide correct results if the start point is on the ground.',
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
                'Bitte beachten Sie, dass Messungen nur korrekte Ergebnisse liefern, wenn der Startpunkt der Messung auf einen Bodenpunkt gesetzt wird.',
            },
          },
        },
      },
    },
    destroy() {
      if (this._measurementManager) {
        this._measurementManager.destroy();
        this._destroy();
      }
    },
  };
}
