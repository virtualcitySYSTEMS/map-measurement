import { watch } from 'vue';
import type {
  CreateFeatureSession,
  GeometryType,
  SelectFeaturesSession,
} from '@vcmap/core';
import { SessionType } from '@vcmap/core';
import type { MeasurementManager } from '../measurementManager.js';

function addKeyListeners(manager: MeasurementManager): () => void {
  const { currentSession, currentEditSession, currentLayer, currentFeatures } =
    manager;
  const layer = manager.getDefaultLayer();

  function handleSelectKeys(event: KeyboardEvent): void {
    if (event.target && (event.target as Element).tagName === 'INPUT') {
      return;
    }
    switch (event.code) {
      case 'Escape':
        if (currentEditSession.value) {
          currentEditSession.value.stop();
        } else if (
          (currentSession.value as SelectFeaturesSession).currentFeatures.length
        ) {
          (currentSession.value as SelectFeaturesSession).clearSelection();
        }
        break;
      case 'Delete':
        if (
          currentLayer.value === layer &&
          (currentSession.value as SelectFeaturesSession)?.currentFeatures
            ?.length
        ) {
          const ids = (
            currentSession.value as SelectFeaturesSession
          ).currentFeatures.map((f) => f.getId()!);
          (currentSession.value as SelectFeaturesSession).clearSelection();
          currentLayer.value.removeFeaturesById(ids);
        }
        break;
      default:
        break;
    }
  }

  function handleCreateKeys(event: KeyboardEvent): void {
    if (event?.target && (event.target as Element).tagName === 'INPUT') {
      return;
    }
    switch (event.code) {
      case 'Escape':
        currentLayer.value.removeFeaturesById([
          currentFeatures.value[0].getId()!,
        ]);
        (currentSession.value as CreateFeatureSession<GeometryType>).finish();
        break;
      case 'Enter':
        (currentSession.value as CreateFeatureSession<GeometryType>).finish();
        break;
      default:
        break;
    }
  }

  if (currentSession.value?.type === SessionType.CREATE) {
    window.addEventListener('keydown', handleCreateKeys);
    return () => {
      window.removeEventListener('keydown', handleCreateKeys);
    };
  } else if (currentSession.value?.type === SessionType.SELECT) {
    window.addEventListener('keydown', handleSelectKeys);
    return () => {
      window.removeEventListener('keydown', handleSelectKeys);
    };
  }
  return () => {};
}

export default function setupKeyListeners(
  manager: MeasurementManager,
): () => void {
  let listeners = (): void => {};
  const watcher = watch(manager.currentSession, (session) => {
    listeners();
    if (session) {
      listeners = addKeyListeners(manager);
    } else {
      listeners = (): void => {};
    }
  });

  return () => {
    listeners();
    watcher();
  };
}
