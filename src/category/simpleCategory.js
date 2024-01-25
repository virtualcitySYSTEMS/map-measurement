import {
  Category,
  writeGeoJSONFeature,
  parseGeoJSON,
  Viewpoint,
  mercatorProjection,
  Extent,
  SessionType,
  FeatureVisibilityAction,
} from '@vcmap/core';
import { Feature } from 'ol';
import { unByKey } from 'ol/Observable.js';
import { watch } from 'vue';
import { isEmpty } from 'ol/extent.js';
import { name } from '../../package.json';
import { createDeleteSelectedAction } from '../util/actionHelper.js';
import { measurementModeSymbol } from '../mode/measurementMode.js';

/**
 * @typedef {Object} SimpleMeasurementItem
 * @property {string} id
 * @property {string} name
 * @property {import("ol").Feature} feature
 */

/**
 * @param {import("ol").Feature} feature
 * @param {import("@vcmap/core").VectorLayer} layer
 * @param {import("../util/toolbox.js").MeasurementType} typeName
 */
function setTitleOnFeature(feature, layer, typeName) {
  let featureName;
  let count = 0;

  const sameTypeFeaturesNames = new Set(
    layer
      .getFeatures()
      .filter((f) => f[measurementModeSymbol]?.type === typeName)
      .map((f) => f.get('title')),
  );

  do {
    count += 1;
    if (!sameTypeFeaturesNames.has(`${typeName}-${count}`)) {
      featureName = `${typeName}-${count}`;
    }
  } while (!featureName);

  feature.set('title', featureName);
}

/**
 * @class
 * @extends {Category<SimpleMeasurementItem>}
 */
class SimpleMeasurementCategory extends Category {
  static get className() {
    return 'SimpleMeasurementCategory';
  }

  constructor(options) {
    super(options);
    /**
     * @type {import("@vcmap/core").VectorLayer}
     * @private
     */
    this._layer = null;
    this._manager = options.manager;
    this._layerListeners = () => {};
    this._setCurrentLayer(options.manager.getDefaultLayer());
    this._manager.category.value = this;
  }

  addToCollection(feature) {
    if (!this.collection.hasKey(feature.getId())) {
      if (!feature.get('title')) {
        const { type } = this._manager.currentMeasurementMode.value;
        setTitleOnFeature(feature, this._layer, type);
      }
      this.collection.add({
        name: feature.getId(),
        feature,
      });
    }
  }

  /**
   * @param {import("@vcmap/core").VectorLayer} layer
   */
  _setCurrentLayer(layer) {
    this._layerListeners();
    this._layer = layer;
    const source = layer.getSource();

    // In case the collection already has layers
    [...this.collection].forEach((item) => {
      if (!this._layer.getFeatureById(item.name)) {
        this._itemAdded(item);
      }
    });

    const sourceListeners = [
      source.on('removefeature', ({ feature }) => {
        const item = this.collection.getByKey(feature.getId());
        if (item) {
          this.collection.remove(item);
        }
      }),
    ];

    this._layerListeners = () => {
      unByKey(sourceListeners);
    };
  }

  mergeOptions(options) {
    super.mergeOptions(options);
    this._setCurrentLayer(options.layer);
  }

  _itemAdded(item) {
    // Is needed because in core the feature first gets removed, which triggers the source listener above and ends in an event trigger cicle that does not stop.
    // If in core intead of removing, just checking if it is already existing AND set item.name as features id ->>> no need to override original function
    if (!this._layer.getFeatureById(item.name)) {
      let { feature } = item;
      if (!(feature instanceof Feature)) {
        const features = parseGeoJSON(feature);
        feature = Array.isArray(features) ? features[0] : features;
      }
      feature.setId(item.name);
      this._layer.addFeatures([feature]);
    }
  }

  _itemRemoved(item) {
    if (this._layer.getFeatureById(item.name)) {
      this._layer.removeFeaturesById([item.name]);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async _deserializeItem(item) {
    const { features } = parseGeoJSON(item.feature);
    if (features[0]) {
      // XXX do we warn on feature collection?
      item.feature = features[0];
    }
    return item;
  }

  // eslint-disable-next-line class-methods-use-this
  _serializeItem(item) {
    return {
      name: item.name,
      feature: writeGeoJSONFeature(item.feature),
    };
  }
}

export default SimpleMeasurementCategory;

/**
 * @param {import("@vcmap/ui").VcsUiApp} vcsApp
 * @param {import("../measurementManager.js").MeasurementManager} manager
 * @param {SimpleMeasurementItem} featureItem
 * @param {Category<SimpleMeasurementItem>} c
 * @param {VcsListItem} categoryListItem
 */
function itemMappingFunction(
  vcsApp,
  manager,
  featureItem,
  c,
  categoryListItem,
) {
  const featureId = featureItem.feature.getId();
  categoryListItem.title = featureItem.feature.get('title') ?? 'Object';
  const layer = manager.getDefaultLayer();

  let hidden = layer.featureVisibility.hiddenObjects[featureItem.name];

  const hideAction = {
    name: 'hideAction',
    icon: hidden ? 'mdi-eye-off' : 'mdi-eye',
    callback() {
      if (!hidden) {
        layer.featureVisibility.hideObjects([featureItem.name]);
        hidden = true;
        this.icon = 'mdi-eye-off';
      } else {
        layer.featureVisibility.showObjects([featureItem.name]);
        hidden = false;
        this.icon = 'mdi-eye';
      }
    },
  };

  const hideListener = layer.featureVisibility.changed.addEventListener(
    (event) => {
      if (
        (event.action === FeatureVisibilityAction.HIDE ||
          event.action === FeatureVisibilityAction.SHOW) &&
        event.ids.some((id) => id === categoryListItem.name)
      ) {
        hidden = !!layer.featureVisibility.hiddenObjects[categoryListItem.name];
        hideAction.icon = hidden ? 'mdi-eye-off' : 'mdi-eye';
      }
    },
  );

  categoryListItem.selectionChanged = (selected) => {
    if (selected && hidden) {
      hideAction.callback();
    }
  };

  categoryListItem.titleChanged = (newTitle) => {
    categoryListItem.title = newTitle;
    featureItem.feature.set('title', newTitle);
  };

  categoryListItem.actions.push(
    ...[
      hideAction,
      {
        name: 'measurement.category.zoomTo',
        async callback() {
          const extent = featureItem.feature.getGeometry()?.getExtent?.();
          if (extent && !isEmpty(extent)) {
            const vp = Viewpoint.createViewpointFromExtent(
              new Extent({
                coordinates: extent,
                projection: mercatorProjection.toJSON(),
              }),
            );
            vp.animate = true;
            await vcsApp.maps.activeMap?.gotoViewpoint(vp);
          }
        },
      },
      {
        name: 'measurement.category.remove',
        callback() {
          if (manager.currentFeatures.value.includes(featureItem.feature)) {
            const newFeatures = manager.currentFeatures.value.filter(
              (feature) => feature.getId() !== featureId,
            );
            manager.currentFeatures.value = newFeatures;
          }
          layer.removeFeaturesById([featureId]);
        },
      },
    ],
  );

  categoryListItem.destroy = () => {
    hideListener();
  };
}

/**
 * @param {MeasurementManager} manager
 * @param {import("@vcmap/ui").CollectionComponent} categoryUiItem
 * @param {import("@vcmap/core").VectorLayer} layer
 * @returns {(function(): void)}
 */
function syncSelection(manager, categoryUiItem, layer) {
  let selectionRevision = 0;
  let featureRevision = 0;

  const selectionWatcher = watch(categoryUiItem.selection, () => {
    if (selectionRevision < featureRevision) {
      selectionRevision = featureRevision;
      return;
    }
    if (selectionRevision === featureRevision) {
      selectionRevision += 1;
      const { selection } = categoryUiItem;
      if (manager.currentLayer.value !== layer) {
        manager.currentLayer.value = layer;
      }
      if (manager.currentSession.value?.type !== SessionType.SELECT) {
        manager.startSelectSession();
      }
      manager.currentSession.value.setCurrentFeatures(
        layer.getFeaturesById(selection.value.map((i) => i.name)),
      );
    }
  });
  const featureWatcher = watch(manager.currentFeatures, () => {
    if (featureRevision < selectionRevision) {
      featureRevision = selectionRevision;
      return;
    }
    if (featureRevision === selectionRevision) {
      featureRevision += 1;
      categoryUiItem.selection.value = categoryUiItem.items.value.filter((i) =>
        manager.currentFeatures.value.find((f) => f.getId() === i.name),
      ); // XXX perfomance?
    }
    if (manager.currentFeatures.value.length !== 0) {
      manager.currentLayer.value.getFeatures().forEach((f) => {
        if (
          !manager.category.value.collection.hasKey(f.getId()) &&
          !manager.currentFeatures.value.includes(f)
        ) {
          manager.currentLayer.value.removeFeaturesById([f.getId()]);
        }
      });
    }
  });
  return () => {
    selectionWatcher();
    featureWatcher();
  };
}

/**
 * @param {import("../measurementManager.js").MeasurementManager} manager
 * @param {VcsUiApp} vcsApp
 * @returns {function():void}
 */
async function createCategory(manager, vcsApp) {
  const layer = manager.getDefaultLayer();

  const { action: removeAction, destroy: destroyRemoveAction } =
    createDeleteSelectedAction(
      manager,
      'drawing-category-removeSelected',
      false,
    );

  const { collectionComponent: categoryUiItem, category } =
    await vcsApp.categoryManager.requestCategory(
      {
        type: SimpleMeasurementCategory.className,
        name: 'Simple Measurement',
        title: 'Measurements',
        manager,
        featureProperty: 'feature',
      },
      name,
      {
        selectable: true,
        overflowCount: 3,
        renamable: true,
      },
    );

  vcsApp.categoryManager.addActions([removeAction], name, [categoryUiItem.id]);

  vcsApp.categoryManager.addMappingFunction(
    () => {
      return true;
    },
    itemMappingFunction.bind(null, vcsApp, manager),
    name,
    [category.name],
  );

  const selectionWatchers = syncSelection(manager, categoryUiItem, layer);
  return () => {
    selectionWatchers();
    vcsApp.categoryManager.removeOwner(name);
    destroyRemoveAction();
  };
}

/**
 * @param {MeasurementManager} manager
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @returns {Promise<function():void>}
 */
export async function setupSimpleCategories(manager, app) {
  const listeners = await createCategory(manager, app);
  return () => {
    listeners.forEach((cb) => cb());
  };
}
