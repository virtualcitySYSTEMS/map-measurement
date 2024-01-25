import { watch, ref } from 'vue';
import { SessionType } from '@vcmap/core';
import { WindowSlot } from '@vcmap/ui';
import { unByKey } from 'ol/Observable.js';
import { name } from '../../package.json';
import measurementWindow from './measurementWindow.vue';
import { MeasurementTypeIcon } from '../util/toolbox.js';

export const measurementPluginWindowId = 'MeasurementPluginWindow';

/**
 * @param {MeasurementManager} manager
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @returns {function():void}
 */
export function setupMeasurementResultWindow(manager, app) {
  let renameListener = () => {};
  const headerTitle = ref();
  const headerIcon = ref();

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

  function toggleWindow() {
    if (manager.currentFeatures.value.length === 1) {
      if (!app.windowManager.has(measurementPluginWindowId)) {
        app.windowManager.add(
          {
            id: measurementPluginWindowId,
            component: measurementWindow,
            slot: WindowSlot.DYNAMIC_CHILD,
            parentId: 'category-manager',
            provides: {
              manager,
            },
            state: {
              headerTitle,
              headerIcon,
              styles: { height: 'auto' },
              infoUrlCallback: app.getHelpUrlCallback(
                'tools/measurementTool.html',
              ),
            },
          },
          name,
        );
      }
    } else if (manager.currentFeatures.value.length === 0) {
      app.windowManager.remove(measurementPluginWindowId);
    }
  }
  const featuresChangedListener = watch(manager.currentFeatures, () => {
    setHeader();
    toggleWindow();
  });

  return {
    destroy: () => {
      app.windowManager.remove(measurementPluginWindowId);
      featuresChangedListener();
    },
  };
}
