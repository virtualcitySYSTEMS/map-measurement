import { SessionType } from '@vcmap/core';
import { watch } from 'vue';

/**
 *
 * @param {import('../measurementManager.js').MeasurementManager} manager The measurement manager
 * @param {string | number} id The action id
 * @returns {import("@vcmap/ui").VcsAction} A VcsAction for deleting the current features.
 */
export function createHideSelectedAction(manager, id) {
  return {
    id,
    name: 'measurement.category.hideSelected',
    icon: '$vcsCheckboxChecked',
    callback() {
      // XXX Copy paste from simple category
      const layer = manager.getDefaultLayer();
      if (
        manager.currentLayer.value === layer &&
        manager.currentFeatures.value?.length > 0 &&
        manager.currentSession.value?.currentFeatures?.length
      ) {
        const ids = manager.currentFeatures.value.map((f) => f.getId());
        manager.currentLayer.value.featureVisibility.hideObjects(ids);
      }
    },
  };
}

/**
 *
 * @param {import('../measurementManager.js').MeasurementManager} manager The measurement manager
 * @param {string | number} id The action id
 * @param {boolean} [hasIcon=true] Whether the action should have an icon or not.
 * @returns {{action: import("@vcmap/ui").VcsAction, destroy: import('vue').WatchStopHandle}} A VcsAction for deleting selected features and the corresponding destroy function.
 */
export function createDeleteSelectedAction(manager, id, hasIcon = true) {
  const removeSelectedTitle = 'measurement.category.removeSelected';
  const removeAllTitle = 'measurement.category.removeAll';
  const removeAction = {
    id,
    name: 'measurement.category.removeSelected',
    icon: hasIcon ? '$vcsTrashCan' : undefined,
    callback() {
      const layer = manager.getDefaultLayer();
      if (
        manager.currentLayer.value === layer &&
        manager.currentFeatures.value?.length > 0 &&
        manager.currentSession.value?.currentFeatures?.length
      ) {
        const ids = manager.currentFeatures.value.map((f) => f.getId());
        manager.currentSession.value.clearSelection();
        manager.currentLayer.value.removeFeaturesById(ids);
      } else if (manager.currentLayer.value.getFeatures().length) {
        const ids = manager.currentLayer.value
          .getFeatures()
          .map((f) => f.getId());
        manager.currentLayer.value.removeFeaturesById(ids);
      }
    },
  };

  const destroyWatcher = watch(
    manager.currentFeatures,
    (currentFeatures) => {
      if (
        manager.currentSession.value?.type === SessionType.SELECT &&
        currentFeatures?.length
      ) {
        removeAction.title = removeSelectedTitle;
      } else {
        removeAction.title = removeAllTitle;
      }
    },
    { immediate: true },
  );

  return {
    action: removeAction,
    destroy: destroyWatcher,
  };
}
