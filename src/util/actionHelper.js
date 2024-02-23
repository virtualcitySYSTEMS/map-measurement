import { writeGeoJSON } from '@vcmap/core';
import { watch } from 'vue';
import { downloadText } from '@vcmap/ui';

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
 * @param {import("@vcmap/ui").CollectionComponent} collectionComponent The collection component of the category.
 * @param {string | number} id The action id
 * @param {boolean} [hasIcon=true] Whether the action should have an icon or not.
 * @returns {{action: import("@vcmap/ui").VcsAction, destroy: import('vue').WatchStopHandle}} A VcsAction for deleting selected features and the corresponding destroy function.
 */
export function createDeleteSelectedAction(
  manager,
  collectionComponent,
  id,
  hasIcon = true,
) {
  const removeAction = {
    id,
    name: 'measurement.category.removeSelected',
    icon: hasIcon ? '$vcsTrashCan' : undefined,
    callback() {
      if (collectionComponent) {
        manager.currentLayer.value.removeFeaturesById(
          collectionComponent.selection.value.map((s) => s.name),
        );
      } else if (manager.currentFeatures.value?.length > 0) {
        manager.currentLayer.value.removeFeaturesById(
          manager.currentFeatures.value.map((f) => f.getId()),
        );
      }
    },
  };

  let destroyWatcher = () => {};
  if (collectionComponent) {
    destroyWatcher = watch(
      collectionComponent.selection,
      (selection) => {
        removeAction.disabled = selection.length === 0;
      },
      { immediate: true },
    );
  }

  return {
    action: removeAction,
    destroy: destroyWatcher,
  };
}

function exportFeatures(features, layer, writeOptions) {
  const text = writeGeoJSON(
    {
      features,
      vcsMeta: layer.getVcsMeta(writeOptions),
    },
    writeOptions,
  );
  downloadText(text, 'measurement.json');
}

/**
 * Creates an action that exports all selected features. If no features are selected, all features of the editorManagers layer are exported.
 * @param {import('../editorManager.js').EditorManager} manager The editorManager
 * @param {import("@vcmap/ui").CollectionComponent} collectionComponent The collection component of the category.
 */
export function createExportCallback(manager, collectionComponent) {
  const writeOptions = {
    writeStyle: true,
    embedIcons: true,
    prettyPrint: true,
    writeId: true,
  };
  const selectedFeatures = manager.currentLayer.value.getFeaturesById(
    collectionComponent.selection.value.map((s) => s.name),
  );
  exportFeatures(selectedFeatures, manager.currentLayer.value, writeOptions);
}
