import {
  GeoJSONwriteOptions,
  SelectFeaturesSession,
  VectorLayer,
  writeGeoJSON,
} from '@vcmap/core';
import { CollectionComponentClass, downloadText, VcsAction } from '@vcmap/ui';
import { watch, WatchStopHandle } from 'vue';
import Feature from 'ol/Feature';
import { MeasurementManager } from '../measurementManager.js';
import { SimpleMeasurementItem } from '../category/simpleCategory.js';

/**
 * @param manager The measurement manager
 * @returns A VcsAction for deleting the current features.
 */
export function createHideSelectedAction(
  manager: MeasurementManager,
): VcsAction {
  return {
    name: 'measurement.category.hideSelected',
    icon: '$vcsCheckboxChecked',
    callback(): void {
      // XXX Copy paste from simple category
      const layer = manager.getDefaultLayer();
      if (
        manager.currentLayer.value === layer &&
        manager.currentFeatures.value?.length > 0 &&
        (manager.currentSession.value as SelectFeaturesSession)?.currentFeatures
          ?.length
      ) {
        const ids = manager.currentFeatures.value.map((f) => f.getId()!);
        manager.currentLayer.value.featureVisibility.hideObjects(ids);
      }
    },
  };
}

/**
 * @param manager The measurement manager
 * @param collectionComponent The collection component of the category.
 * @param hasIcon Whether the action should have an icon or not.
 * @returns A VcsAction for deleting selected features and the corresponding destroy function.
 */
export function createDeleteSelectedAction(
  manager: MeasurementManager,
  collectionComponent?: CollectionComponentClass<SimpleMeasurementItem>,
  hasIcon = true,
): { action: VcsAction; destroy: WatchStopHandle } {
  const removeAction: VcsAction = {
    name: 'measurement.category.removeSelected',
    icon: hasIcon ? '$vcsTrashCan' : undefined,
    callback(): void {
      if (collectionComponent) {
        manager.currentLayer.value.removeFeaturesById(
          collectionComponent.selection.value.map((s) => s.name),
        );
      } else if (manager.currentFeatures.value?.length > 0) {
        manager.currentLayer.value.removeFeaturesById(
          manager.currentFeatures.value.map((f) => f.getId()!),
        );
      }
    },
  };

  let destroyWatcher = (): void => {};
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

function exportFeatures(
  features: Feature[],
  layer: VectorLayer,
  writeOptions: GeoJSONwriteOptions,
): void {
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
 * @param manager The editorManager
 * @param collectionComponent The collection component of the category.
 */
export function createExportCallback(
  manager: MeasurementManager,
  collectionComponent: CollectionComponentClass<SimpleMeasurementItem>,
): void {
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
