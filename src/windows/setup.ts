import { watch } from 'vue';
import type { SelectFeaturesSession } from '@vcmap/core';
import { SessionType } from '@vcmap/core';
import type { VcsUiApp, CollectionComponentClass } from '@vcmap/ui';
import {
  createListExportAction,
  createListImportAction,
  importIntoLayer,
  makeEditorCollectionComponentClass,
  WindowSlot,
} from '@vcmap/ui';
import { unByKey } from 'ol/Observable.js';
import type { SimpleMeasurementItem } from '../category/simpleCategory.js';
import MeasurementWindow from './MeasurementWindow.vue';
import { createExportCallback } from '../util/actionHelper.js';
import type { MeasurementManager } from '../measurementManager.js';
import { name } from '../../package.json';

/**
 * @param collectionComponent The collection component of the category.
 */
export default function setupMeasurementResultWindow(
  manager: MeasurementManager,
  app: VcsUiApp,
  collectionComponent: CollectionComponentClass<SimpleMeasurementItem>,
): { destroy: () => void } {
  const windowId = 'tempMeasurementWindowId';
  const editor = {
    component: MeasurementWindow,
    provides: {
      app,
      manager,
    },
    state: {
      headerTitle: 'measurement.header.title',
      headerIcon: '',
      styles: { height: 'auto' },
      infoUrlCallback: app.getHelpUrlCallback('tools/measurementTool.html'),
    },
  };

  const editorCollectionComponent = makeEditorCollectionComponentClass(
    app,
    collectionComponent,
    { editor: () => ({ ...editor }) },
  );

  const { action: exportAction, destroy: destroyExportAction } =
    createListExportAction(
      collectionComponent.selection,
      () => {
        createExportCallback(manager, collectionComponent);
      },
      name,
    );

  const { action: importAction, destroy: destroyImportAction } =
    createListImportAction(
      async (files) => {
        const layerListener = manager.currentLayer.value
          .getSource()
          .on('addfeature', ({ feature }) => {
            manager.addMeasurement(feature!);
          });
        await importIntoLayer(files, app, manager.currentLayer.value);
        unByKey(layerListener);
        return true;
      },
      app.windowManager,
      name,
      'category-manager',
    );
  editorCollectionComponent.addActions([importAction, exportAction]);

  const featuresChangedListener = watch(manager.currentFeatures, () => {
    if (app.windowManager.has(windowId)) {
      app.windowManager.remove(windowId);
    }

    // avoid cycle call
    const currentSelectedIds = collectionComponent.selection.value.map(
      (s) => s.name,
    );
    const currentFeatureIds = manager.currentFeatures.value.map((f) =>
      f.getId(),
    );
    if (
      currentSelectedIds.every((id) => currentFeatureIds.includes(id)) &&
      currentFeatureIds.every((id) =>
        currentSelectedIds.includes(id!.toString()),
      )
    ) {
      return;
    }

    // update collection component selection
    const matchedSelection = collectionComponent.items.value.filter((i) =>
      currentFeatureIds.includes(i.name),
    );
    if (
      currentFeatureIds.length === 1 &&
      matchedSelection.length === 0 &&
      manager.currentLayer.value.getFeatureById(currentFeatureIds[0]!)
    ) {
      app.windowManager.add(
        {
          ...editor,
          id: windowId,
          parentId: 'category-manager',
          slot: WindowSlot.DYNAMIC_CHILD,
        },
        name,
      );
    } else {
      collectionComponent.selection.value = matchedSelection;
    }

    // remove temporary measurement feature
    if (currentFeatureIds.length !== 0) {
      manager.currentLayer.value.getFeatures().forEach((f) => {
        if (
          !collectionComponent.items.value.find((i) => f.getId() === i.name) &&
          !manager.currentFeatures.value.includes(f)
        ) {
          manager.currentLayer.value.removeFeaturesById([f.getId()!]);
        }
      });
    }
  });

  const selectionChangedListener = watch(collectionComponent.selection, () => {
    if (collectionComponent.selection.value.length !== 0) {
      if (manager.currentSession.value?.type !== SessionType.SELECT) {
        manager.startSelectSession([]);
      }
      // eslint-disable-next-line no-void
      void (
        manager.currentSession.value as SelectFeaturesSession
      ).setCurrentFeatures(
        manager.currentLayer.value.getFeaturesById(
          collectionComponent.selection.value.map((s) => s.name),
        ),
      );
    } else {
      (
        manager.currentSession.value as SelectFeaturesSession
      )?.clearSelection?.();
      manager.stopEditing();
    }
  });

  return {
    destroy: (): void => {
      app.windowManager.remove(windowId);
      featuresChangedListener();
      selectionChangedListener();
      destroyImportAction();
      destroyExportAction();
    },
  };
}
