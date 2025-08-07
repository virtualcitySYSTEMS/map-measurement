import type {
  VectorLayer,
  VcsObjectOptions,
  SelectFeaturesSession,
} from '@vcmap/core';
import {
  CesiumMap,
  OpenlayersMap,
  ObliqueMap,
  Category,
  writeGeoJSONFeature,
  parseGeoJSON,
  Viewpoint,
  mercatorProjection,
  Extent,
  FeatureVisibilityAction,
} from '@vcmap/core';
import type {
  CollectionComponentClass,
  CollectionComponentListItem,
  VcsUiApp,
} from '@vcmap/ui';
import { createSupportedMapMappingFunction } from '@vcmap/ui';
import { reactive } from 'vue';
import { Feature } from 'ol';
import { unByKey } from 'ol/Observable.js';
import { isEmpty } from 'ol/extent.js';
import type { MeasurementManager } from '../measurementManager.js';
import { name } from '../../package.json';
import { createDeleteSelectedAction } from '../util/actionHelper.js';
import type { MeasurementType } from '../mode/measurementMode.js';
import { measurementModeSymbol } from '../mode/measurementMode.js';

export type SimpleMeasurementItem = VcsObjectOptions & {
  id: string;
  name: string;
  feature: Feature;
};

function setTitleOnFeature(
  feature: Feature,
  layer: VectorLayer,
  typeName: MeasurementType,
): void {
  let featureName;
  let count = 0;

  const sameTypeFeaturesNames = new Set(
    layer
      .getFeatures()
      .filter((f) => f[measurementModeSymbol]?.type === typeName)
      .map((f) => f.get('title') as string),
  );

  do {
    count += 1;
    if (!sameTypeFeaturesNames.has(`${typeName}-${count}`)) {
      featureName = `${typeName}-${count}`;
    }
  } while (!featureName);

  feature.set('title', featureName);
}

class SimpleMeasurementCategory extends Category<SimpleMeasurementItem> {
  static get className(): string {
    return 'SimpleMeasurementCategory';
  }

  protected _layer: VectorLayer | null;

  private _layerListeners: () => void;

  constructor(options: VcsObjectOptions) {
    super(options);
    this._layer = null;
    this._layerListeners = (): void => {};
  }

  addToCollection(feature: Feature): void {
    if (!this.collection.hasKey(feature.getId())) {
      if (!feature.get('title')) {
        const { type } = feature[measurementModeSymbol];
        setTitleOnFeature(feature, this._layer!, type);
      }
      this.collection.add({
        id: feature.getId()!.toString(),
        name: feature.getProperty('title'),
        feature,
      });
    }
  }

  setCurrentLayer(layer: VectorLayer): void {
    this._layerListeners();
    this._layer = layer;
    const source = layer.getSource();

    // In case the collection already has layers
    [...this.collection].forEach((item) => {
      if (!this._layer?.getFeatureById(item.name)) {
        this._itemAdded(item);
      }
    });

    const sourceListeners = [
      source.on('removefeature', ({ feature }) => {
        const item = this.collection.getByKey(feature?.getId());
        if (item) {
          this.collection.remove(item);
        }
      }),
    ];

    this._layerListeners = (): void => {
      unByKey(sourceListeners);
    };
  }

  mergeOptions(options: VcsObjectOptions): void {
    super.mergeOptions(options);
  }

  protected _itemAdded(item: SimpleMeasurementItem): void {
    // Is needed because in core the feature first gets removed, which triggers the source listener above and ends in an event trigger cicle that does not stop.
    // If in core intead of removing, just checking if it is already existing AND set item.name as features id ->>> no need to override original function
    if (!this._layer?.getFeatureById(item.name)) {
      let { feature } = item;
      if (!(feature instanceof Feature)) {
        const features = parseGeoJSON(feature);
        feature = Array.isArray(features) ? features[0] : features;
      }
      feature.setId(item.name);
      this._layer!.addFeatures([feature]);
    }
  }

  protected _itemRemoved(item: SimpleMeasurementItem): void {
    if (this._layer?.getFeatureById(item.name)) {
      this._layer.removeFeaturesById([item.name]);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected _deserializeItem(
    item: SimpleMeasurementItem,
  ): Promise<SimpleMeasurementItem> {
    const { features } = parseGeoJSON(item.feature);
    if (features[0]) {
      // XXX do we warn on feature collection?
      item.feature = features[0];
    }
    return Promise.resolve(item);
  }

  // eslint-disable-next-line class-methods-use-this
  protected _serializeItem(item: SimpleMeasurementItem): SimpleMeasurementItem {
    return {
      id: item.id,
      name: item.name,
      feature: writeGeoJSONFeature(item.feature),
    };
  }

  destroy(): void {
    this._layerListeners = (): void => {};
    this._layer = null;
    super.destroy();
  }
}

export default SimpleMeasurementCategory;

function itemMappingFunction(
  app: VcsUiApp,
  manager: MeasurementManager,
  featureItem: SimpleMeasurementItem,
  _c: CollectionComponentClass<SimpleMeasurementItem>,
  categoryListItem: CollectionComponentListItem,
): void {
  const featureId = featureItem.feature.getId();
  categoryListItem.title = featureItem.feature.get('title') ?? 'Object';
  const layer = manager.getDefaultLayer();

  let hidden = !!layer.featureVisibility.hiddenObjects[featureItem.name];

  const hideAction = reactive({
    name: 'hideAction',
    icon: hidden ? '$vcsCheckbox' : '$vcsCheckboxChecked',
    callback(): void {
      if (!hidden) {
        layer.featureVisibility.hideObjects([featureItem.name]);
        hidden = true;
        this.icon = '$vcsCheckbox';
      } else {
        layer.featureVisibility.showObjects([featureItem.name]);
        hidden = false;
        this.icon = '$vcsCheckboxChecked';
      }
    },
  });

  const hideListener = layer.featureVisibility.changed.addEventListener(
    (event) => {
      if (
        (event.action === FeatureVisibilityAction.HIDE ||
          event.action === FeatureVisibilityAction.SHOW) &&
        event.ids.some((id) => id === categoryListItem.name)
      ) {
        hidden = !!layer.featureVisibility.hiddenObjects[categoryListItem.name];
        hideAction.icon = hidden ? '$vcsCheckbox' : '$vcsCheckboxChecked';
      }
    },
  );

  categoryListItem.selectionChanged = (selected): void => {
    if (selected && hidden) {
      hideAction.callback();
    }
  };

  categoryListItem.titleChanged = (newTitle): void => {
    categoryListItem.title = newTitle;
    featureItem.feature.set('title', newTitle);
  };

  categoryListItem.actions.push(
    ...[
      hideAction,
      {
        name: 'measurement.category.zoomTo',
        async callback(): Promise<void> {
          const extent = featureItem.feature.getGeometry()?.getExtent?.();
          if (extent && !isEmpty(extent)) {
            const vp = Viewpoint.createViewpointFromExtent(
              new Extent({
                coordinates: extent,
                projection: mercatorProjection.toJSON(),
              }),
            );
            if (vp) {
              vp.animate = true;
              await app.maps.activeMap?.gotoViewpoint(vp);
            }
          }
        },
      },
      {
        name: 'measurement.category.remove',
        callback(): void {
          if (manager.currentFeatures.value.includes(featureItem.feature)) {
            const newFeatures = manager.currentFeatures.value.filter(
              (feature) => feature.getId() !== featureId,
            );
            manager.currentFeatures.value = newFeatures;
          }
          layer.removeFeaturesById([featureId!]);
        },
      },
    ],
  );

  categoryListItem.destroy = (): void => {
    hideListener();
  };
}

export async function createCategory(
  manager: MeasurementManager,
  app: VcsUiApp,
): Promise<{
  categoryUiItem: CollectionComponentClass<SimpleMeasurementItem>;
  destroy: () => void;
}> {
  const layer = manager.currentLayer.value;

  const { collectionComponent: categoryUiItem, category } =
    await app.categoryManager.requestCategory<SimpleMeasurementItem>(
      {
        type: SimpleMeasurementCategory.className,
        name: 'Simple Measurement',
        title: 'measurement.category.title',
        featureProperty: 'feature',
      },
      name,
      {
        selectable: true,
        overflowCount: 3,
        renamable: true,
      },
    );

  manager.category = category as SimpleMeasurementCategory;
  manager.category.setCurrentLayer(layer);

  const hideAllAction = reactive({
    name: 'hideAllAction',
    icon: '$vcsCheckboxChecked',
    callback(): void {
      const hiddenObjectIds = Object.keys(
        layer.featureVisibility.hiddenObjects,
      );
      if (
        categoryUiItem.items.value.every(
          (i) => !hiddenObjectIds.includes(i.name),
        )
      ) {
        layer.featureVisibility.hideObjects(
          layer.getFeatures().map((feature) => feature.getId()!),
        );
        if (manager.currentFeatures.value) {
          (
            manager.currentSession.value as SelectFeaturesSession
          )?.clearSelection?.();
        }
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
          categoryUiItem.items.value.every((i) =>
            hiddenObjectIds.includes(i.name),
          )
        ) {
          hideAllAction.icon = '$vcsCheckbox';
        } else if (
          categoryUiItem.items.value.every(
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

  const { action: removeAction, destroy: destroyRemoveAction } =
    createDeleteSelectedAction(manager, categoryUiItem, false);

  categoryUiItem.addActions(
    [hideAllAction, removeAction].map((action) => ({
      action,
      owner: name,
    })),
  );

  categoryUiItem.addItemMapping({
    mappingFunction: itemMappingFunction.bind(null, app, manager),
    owner: name,
  });

  categoryUiItem.addItemMapping({
    mappingFunction: createSupportedMapMappingFunction(
      [CesiumMap.className, OpenlayersMap.className, ObliqueMap.className],
      app.maps,
    ),
    owner: name,
  });

  return {
    categoryUiItem,
    destroy(): void {
      app.categoryManager.removeOwner(name);
      destroyRemoveAction();
      destroyHideAllAction();
    },
  };
}
