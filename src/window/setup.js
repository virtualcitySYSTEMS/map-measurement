import { watch, ref } from 'vue';
import { SessionType } from '@vcmap/core';
import { makeEditorCollectionComponentClass, WindowSlot } from '@vcmap/ui';
import { unByKey } from 'ol/Observable.js';
import { name } from '../../package.json';
import measurementWindow from './measurementWindow.vue';
import { MeasurementTypeIcon } from '../util/toolbox.js';

export const measurementPluginWindowId = 'MeasurementPluginWindow';

/**
 * @param {MeasurementManager} manager
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @param {import("@vcmap/ui").CollectionComponent} collectionComponent The collection component of the category.
 * @returns {function():void}
 */
export function setupMeasurementResultWindow(
  manager,
  app,
  collectionComponent,
) {
  let renameListener = () => {};
  const headerTitle = ref();
  const headerIcon = ref();
  const windowId = `${collectionComponent.id}-editor`;

  const editor = {
    component: measurementWindow,
    provides: {
      manager,
    },
    state: {
      headerTitle,
      headerIcon,
      styles: { height: 'auto' },
      infoUrlCallback: app.getHelpUrlCallback('tools/measurementTool.html'),
    },
  };

  makeEditorCollectionComponentClass(app, collectionComponent, {
    editor: () => ({
      ...editor,
    }),
  });

  function setHeader() {
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
      renameListener = () => {
        unByKey(propertyChangeListener);
      };
      headerTitle.value = features[0].get('title')
        ? features[0].get('title')
        : 'Measurement';
    }
    if (manager.currentMeasurementMode.value) {
      headerIcon.value =
        MeasurementTypeIcon[manager.currentMeasurementMode.value.type];
    }
  }

  const featuresChangedListener = watch(manager.currentFeatures, () => {
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
      currentFeatureIds.every((id) => currentSelectedIds.includes(id))
    ) {
      return;
    }

    // update collection component selection
    const matchedSelection = collectionComponent.items.value.filter((i) =>
      currentFeatureIds.includes(i.name),
    );
    if (currentFeatureIds.length === 1 && matchedSelection.length === 0) {
      if (!app.windowManager.has(windowId)) {
        app.windowManager.add(
          {
            ...editor,
            id: windowId,
            parentId: 'category-manager',
            slot: WindowSlot.DYNAMIC_CHILD,
          },
          name,
        );
      }
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
          manager.currentLayer.value.removeFeaturesById([f.getId()]);
        }
      });
    }
  });

  const selectionChangedListener = watch(collectionComponent.selection, () => {
    if (collectionComponent.selection.value.length !== 0) {
      if (manager.currentSession.value?.type !== SessionType.SELECT) {
        manager.startSelectSession();
      }
      manager.currentSession.value.setCurrentFeatures(
        manager.currentLayer.value.getFeaturesById(
          collectionComponent.selection.value.map((s) => s.name),
        ),
      );
    } else {
      manager.currentSession.value?.clearSelection?.();
      manager.stopEditing();
    }
  });

  return {
    destroy: () => {
      app.windowManager.remove(measurementPluginWindowId);
      featuresChangedListener();
      selectionChangedListener();
    },
  };
}
