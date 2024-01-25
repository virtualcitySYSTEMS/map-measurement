import { SessionType, vcsLayerName } from '@vcmap/core';

import {
  createDeleteSelectedAction,
  createHideSelectedAction,
} from './actionHelper.js';
import { measurementModeSymbol } from '../mode/measurementMode.js';
import { MeasurementType } from './toolbox.js';

/**
 * Adds edit actions to the context menu.
 * @param {import("@vcmap/ui").VcsUiApp} app The VcsUiApp instance
 * @param {MeasurementManager} manager The measurement manager
 * @param {string | symbol} owner The owner of the context menu entries.
 */
export default function addContextMenu(app, manager, owner) {
  app.contextMenuManager.addEventHandler((event) => {
    const contextEntries = [];
    if (
      event.feature &&
      event.feature[vcsLayerName] === manager.currentLayer.value.name
    ) {
      const targetFeature = event.feature;
      let editFeatures = manager.currentFeatures.value;
      if (manager.currentSession.value?.type !== SessionType.SELECT) {
        manager.startSelectSession([targetFeature]);
        editFeatures = [targetFeature];
      } else if (
        !editFeatures.some(
          (feature) => feature.getId() === targetFeature.getId(),
        )
      ) {
        manager.currentSession.value.setCurrentFeatures([targetFeature]);
        editFeatures = [targetFeature];
      }

      if (editFeatures.length === 1) {
        if (
          editFeatures[0][measurementModeSymbol].type !==
          MeasurementType.ObliqueHeight2D
        ) {
          contextEntries.push({
            id: 'measurement-edit',
            name: 'measurement.edit',
            icon: '$vcsEditVertices',
            callback() {
              manager.startEditSession();
            },
          });
        }
      }

      contextEntries.push(
        createHideSelectedAction(manager, 'draw-context-hideSelected'),
      );

      contextEntries.push(
        createDeleteSelectedAction(manager, 'draw-context-delete').action,
      );
    } else {
      manager.currentSession.value?.clearSelection?.();
    }
    return contextEntries;
  }, owner);
}
