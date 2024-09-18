import { watch, ref, Ref } from 'vue';
import { SelectFeaturesSession, SessionType } from '@vcmap/core';
import {
  createListExportAction,
  createListImportAction,
  importIntoLayer,
  makeEditorCollectionComponentClass,
  VcsUiApp,
  WindowSlot,
  CollectionComponentClass,
} from '@vcmap/ui';
import { unByKey } from 'ol/Observable.js';
import { SimpleMeasurementItem } from '../category/simpleCategory.js';
import measurementWindow from './measurementWindow.vue';
import { MeasurementTypeIcon } from '../util/toolbox.js';
import { createExportCallback } from '../util/actionHelper.js';
import { MeasurementManager } from '../measurementManager.js';
import { name } from '../../package.json';

/**
 * @param collectionComponent The collection component of the category.
 */
export default function setupMeasurementResultWindow(
  manager: MeasurementManager,
  app: VcsUiApp,
  collectionComponent: CollectionComponentClass<SimpleMeasurementItem>,
): { destroy: () => void } {
  let renameListener = (): void => {};
  const headerTitle: Ref<string> = ref('');
  const headerIcon: Ref<string> = ref('');
  const windowId = 'tempMeasurementWindowId';

  const editor = {
    component: measurementWindow,
    provides: {
      app,
      manager,
    },
    state: {
      headerTitle,
      headerIcon,
      styles: { height: 'auto' },
      infoUrlCallback: app.getHelpUrlCallback('tools/measurementTool.html'),
    },
  };

  const editorCollectionComponent = makeEditorCollectionComponentClass(
    app,
    collectionComponent,
    {
      // XXX to be removed once headerTitile as Ref<string> is supported
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      editor: () => ({ ...editor }),
    },
  );

  const { action: exportAction, destroy: destroyExportAction } =
    createListExportAction(
      collectionComponent.selection,
      () => createExportCallback(manager, collectionComponent),
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

  function setHeader(): void {
    renameListener();
    const features = manager.currentFeatures.value;
    if (features.length > 1) {
      headerTitle.value = `(${features.length}) Features`;
    } else if (manager.currentSession.value?.type === SessionType.CREATE) {
      headerTitle.value = 'measurement.header.title';
    } else if (features.length) {
      const propertyChangeListener = features[0].on(
        'propertychange',
        ({ key }) => {
          if (key === 'title') {
            headerTitle.value = features[0].get(key);
          }
        },
      );
      renameListener = (): void => {
        unByKey(propertyChangeListener);
      };
      headerTitle.value = features[0].get('title')
        ? features[0].get('title')
        : 'measurement.header.title';
    }
    if (manager.currentMeasurementMode.value) {
      headerIcon.value =
        MeasurementTypeIcon[manager.currentMeasurementMode.value.type];
    }
  }

  const featuresChangedListener = watch(manager.currentFeatures, () => {
    if (app.windowManager.has(windowId)) {
      app.windowManager.remove(windowId);
    }

    setHeader();

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
        // XXX to be removed once headerTitile as Ref<string> is supported
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
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