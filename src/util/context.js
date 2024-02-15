import { SessionType, vcsLayerName } from '@vcmap/core';

import {
  createDeleteSelectedAction,
  createHideSelectedAction,
} from './actionHelper.js';
import {
  isSupportedMeasurement,
  measurementModeSymbol,
  MeasurementType,
} from '../mode/measurementMode.js';

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
      const isCreate =
        manager.currentSession.value?.type === SessionType.CREATE;
      if (
        !isCreate &&
        manager.currentSession.value?.type !== SessionType.SELECT
      ) {
        setTimeout(() => {
          // timeout prevents right click on opened editor window
          manager.startSelectSession([event.feature]);
        }, 0);
        editFeatures = [targetFeature];
      } else if (
        manager.currentSession.value?.type === SessionType.SELECT &&
        !editFeatures.some(
          (feature) => feature.getId() === targetFeature.getId(),
        )
      ) {
        setTimeout(() => {
          // timeout prevents right click on opened editor window
          manager.currentSession.value.setCurrentFeatures([event.feature]);
        }, 0);
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
            disabled:
              isCreate || !isSupportedMeasurement(editFeatures[0], event.map),
            callback() {
              manager.startEditSession();
            },
          });
        }
      }

      const hideSelectionsAction = createHideSelectedAction(
        manager,
        'draw-context-hideSelected',
      );
      const deleteAction = createDeleteSelectedAction(
        manager,
        null,
        'draw-context-delete',
      ).action;
      hideSelectionsAction.disabled = isCreate;
      deleteAction.disabled = isCreate;

      contextEntries.push(hideSelectionsAction, deleteAction);
    } else {
      manager.currentSession.value?.clearSelection?.();
    }
    return contextEntries;
  }, owner);
}
