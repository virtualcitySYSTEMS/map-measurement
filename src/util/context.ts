import { vcsLayerName } from '@vcmap/core';
import type { VcsUiApp } from '@vcmap/ui';
import type {
  MeasurementFeature,
  MeasurementManager,
} from '../measurementManager.js';
import { isSupportedMeasurement } from '../mode/measurementMode.js';
import { isCreateSession } from './actionHelper';
import { name } from '../../package.json';

export default function addContextMenu(
  app: VcsUiApp,
  manager: MeasurementManager,
): void {
  app.contextMenuManager.addEventHandler((event) => {
    const contextEntries = [];
    if (event.feature && event.feature[vcsLayerName] === manager.layer.name) {
      const targetFeature = event.feature as MeasurementFeature;
      const isCreate = isCreateSession(manager.currentSession.value);
      if (!isCreate && manager.currentFeature.value !== targetFeature) {
        // there used to be a check here, if the feature should be persisted. why i dont know
        contextEntries.push({
          id: 'measurement-select',
          name: 'measurement.select',
          icon: '$vcsPen',
          disabled: !isSupportedMeasurement(targetFeature, event.map),
          callback() {
            manager.currentFeature.value = targetFeature;
          },
        });
      }
    }
    return contextEntries;
  }, name);
}
