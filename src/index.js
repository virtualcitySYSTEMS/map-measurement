import { moduleIdSymbol } from '@vcmap/core';

import { name, version, mapVersion } from '../package.json';
import { addToolButtons, MeasurementType } from './util/toolbox.js';
import { createMeasurementManager } from './measurementManager.js';
import { setupMeasurementResultWindow } from './window/setup.js';
import setupKeyListeners from './util/keyListeners.js';
import addContextMenu from './util/context.js';

import SimpleMeasurementCategory, {
  setupSimpleCategories,
} from './category/simpleCategory.js';

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
      const destroyButtons = addToolButtons(this._measurementManager, vcsUiApp);
      const { destroy: destroyDrawWindow } = setupMeasurementResultWindow(
        this._measurementManager,
        vcsUiApp,
      );

      const destroyKeyListeners = setupKeyListeners(this._measurementManager);
      vcsUiApp.categoryClassRegistry.registerClass(
        this[moduleIdSymbol],
        SimpleMeasurementCategory.className,
        SimpleMeasurementCategory,
      );

      const destroySimpleCategory = await setupSimpleCategories(
        this._measurementManager,
        vcsUiApp,
      );

      addContextMenu(vcsUiApp, this._measurementManager, this.name);
      this._destroy = () => {
        destroyButtons();
        destroyDrawWindow();
        destroySimpleCategory();
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
            [MeasurementType.Position3D]: 'Point',
            [MeasurementType.Distance2D]: '2D-Distance',
            [MeasurementType.Distance3D]: '3D-Distance',
            [MeasurementType.Area2D]: '2D-Area',
            [MeasurementType.Area3D]: '3D-Area',
            [MeasurementType.ObliqueHeight2D]: '2D-Height',
            [MeasurementType.Height3D]: '3D-Height',
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
            removeSelected: 'Remove selected measurements',
            removeAll: 'Remove all measurements',
            exportSelected: 'Export selected measurements',
            exportAll: 'Export all measurements',
          },
          hint: {
            oblique:
              'Please notice that measurements only provide correct results if measured on the ground',
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
            [MeasurementType.Position3D]: 'Punkt',
            [MeasurementType.Distance2D]: '2D-Distanz',
            [MeasurementType.Distance3D]: '3D-Distanz',
            [MeasurementType.Area2D]: '2D-Fläche',
            [MeasurementType.Area3D]: '3D-Fläche',
            [MeasurementType.ObliqueHeight2D]: '2D-Höhe',
            [MeasurementType.Height3D]: '3D-Höhe',
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
            removeSelected: 'Selektierte Messungen löschen',
            removeAll: 'Alle Messungen löschen',
            exportSelected: 'Selektierte Messungen exportieren',
            exportAll: 'Alle Messungen exportieren',
          },
          hint: {
            oblique:
              'Bitte beachten Sie, dass Messungen nur dann korrekte Ergebnisse liefern, wenn sie auf dem Boden gemessen werden.',
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
