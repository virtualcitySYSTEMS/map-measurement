import type {
  GeoJSONwriteOptions,
  VectorLayer,
  EditorSession,
  CreateFeatureSession,
  GeometryType,
  EditGeometrySession,
} from '@vcmap/core';
import {
  FeatureVisibilityAction,
  writeGeoJSON,
  SessionType,
} from '@vcmap/core';
import type { CollectionComponentClass, VcsAction } from '@vcmap/ui';
import { downloadText } from '@vcmap/ui';
import { reactive, type ShallowRef } from 'vue';
import type Feature from 'ol/Feature';

import type { MeasurementFeature } from '../measurementManager';

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
 * @param layer
 * @param collectionComponent The collection component of the category.
 */
export function createExportCallback(
  layer: VectorLayer,
  collectionComponent: CollectionComponentClass<MeasurementFeature>,
): void {
  const writeOptions = {
    writeStyle: true,
    embedIcons: true,
    prettyPrint: true,
    writeId: true,
  };
  const selectedFeatures = layer.getFeaturesById(
    collectionComponent.selection.value.map((s) => s.name),
  );
  exportFeatures(selectedFeatures, layer, writeOptions);
}

export function createHideAllAction(
  layer: VectorLayer,
  currentFeature: ShallowRef<MeasurementFeature | undefined>,
  collectionComponent: CollectionComponentClass<MeasurementFeature>,
): {
  action: VcsAction;
  destroy: () => void;
} {
  const hideAllAction = reactive({
    name: 'hideAllAction',
    icon: '$vcsCheckboxChecked',
    callback(): void {
      const hiddenObjectIds = Object.keys(
        layer.featureVisibility.hiddenObjects,
      );
      if (
        collectionComponent.items.value.every(
          (i) => !hiddenObjectIds.includes(i.name),
        )
      ) {
        layer.featureVisibility.hideObjects(
          layer.getFeatures().map((feature) => feature.getId()!),
        );
        currentFeature.value = undefined;
        this.icon = '$vcsCheckbox';
      } else {
        layer.featureVisibility.clearHiddenObjects();
        this.icon = '$vcsCheckboxChecked';
      }
    },
  });

  const destroyHideAllAction = layer.featureVisibility.changed.addEventListener(
    (event) => {
      if (
        event.action === FeatureVisibilityAction.HIDE ||
        event.action === FeatureVisibilityAction.SHOW
      ) {
        const hiddenObjectIds = Object.keys(
          layer.featureVisibility.hiddenObjects,
        );
        if (
          collectionComponent.items.value.every((i) =>
            hiddenObjectIds.includes(i.name),
          )
        ) {
          hideAllAction.icon = '$vcsCheckbox';
        } else if (
          collectionComponent.items.value.every(
            (i) => !hiddenObjectIds.includes(i.name),
          )
        ) {
          hideAllAction.icon = '$vcsCheckboxChecked';
        } else {
          hideAllAction.icon = '$vcsCheckboxIndeterminate';
        }
      }
    },
  );

  return { action: hideAllAction, destroy: destroyHideAllAction };
}

export function isCreateSession(
  session?: EditorSession,
): session is CreateFeatureSession<GeometryType> {
  return session?.type === SessionType.CREATE;
}

export function isEditGeometrySession(
  session?: EditorSession,
): session is EditGeometrySession {
  return session?.type === SessionType.EDIT_GEOMETRY;
}
