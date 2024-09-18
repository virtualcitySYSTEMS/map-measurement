import { SelectFeaturesSession, SessionType, vcsLayerName } from '@vcmap/core';
import { VcsUiApp } from '@vcmap/ui';
import Feature from 'ol/Feature.js';
import { MeasurementManager } from '../measurementManager.js';
import {
  createDeleteSelectedAction,
  createHideSelectedAction,
} from './actionHelper.js';
import {
  doNotEditAndPersistent,
  isSupportedMeasurement,
} from '../mode/measurementMode.js';

/**
 * Adds edit actions to the context menu.
 * @param app The VcsUiApp instance
 * @param manager The measurement manager
 * @param owner The owner of the context menu entries.
 */
export default function addContextMenu(
  app: VcsUiApp,
  manager: MeasurementManager,
  owner: string | symbol,
): void {
  app.contextMenuManager.addEventHandler((event) => {
    const contextEntries = [];
    if (
      event.feature &&
      event.feature[vcsLayerName] === manager.currentLayer.value.name
    ) {
      const targetFeature = event.feature as Feature;
      let editFeatures = manager.currentFeatures.value;
      const isCreate =
        manager.currentSession.value?.type === SessionType.CREATE;
      if (
        !isCreate &&
        manager.currentSession.value?.type !== SessionType.SELECT
      ) {
        setTimeout(() => {
          // timeout prevents right click on opened editor window
          manager.startSelectSession([targetFeature]);
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
          // eslint-disable-next-line no-void
          void (
            manager.currentSession.value as SelectFeaturesSession
          ).setCurrentFeatures([event.feature as Feature]);
        }, 0);
        editFeatures = [targetFeature];
      }

      if (editFeatures.length === 1) {
        if (!editFeatures[0][doNotEditAndPersistent]) {
          contextEntries.push({
            id: 'measurement-edit',
            name: 'measurement.edit',
            icon: '$vcsEditVertices',
            disabled:
              isCreate || !isSupportedMeasurement(editFeatures[0], event.map),
            callback() {
              manager.startEditSession(editFeatures[0]);
            },
          });
        }
      }

      const hideSelectionsAction = createHideSelectedAction(manager);
      const deleteAction = createDeleteSelectedAction(
        manager,
        undefined,
      ).action;
      hideSelectionsAction.disabled = isCreate;
      deleteAction.disabled = isCreate;

      contextEntries.push(hideSelectionsAction, deleteAction);
    } else {
      (
        manager.currentSession.value as SelectFeaturesSession
      )?.clearSelection?.();
    }
    return contextEntries;
  }, owner);
}
