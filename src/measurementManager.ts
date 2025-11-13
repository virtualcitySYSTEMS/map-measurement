import { nextTick, reactive, type ShallowRef, shallowRef, watch } from 'vue';
import {
  CesiumMap,
  Collection,
  doNotTransform,
  type EditorSession,
  FeatureVisibilityAction,
  makeOverrideCollection,
  markVolatile,
  maxZIndexMin50,
  mercatorProjection,
  ObliqueMap,
  OpenlayersMap,
  type OverrideCollection,
  PanoramaMap,
  type SessionType,
  startCreateFeatureSession,
  startEditGeometrySession,
  VectorLayer,
  VectorStyleItem,
  type originalFeatureSymbol,
  writeGeoJSONFeature,
  parseGeoJSON,
} from '@vcmap/core';
import { getLogger } from '@vcsuite/logger';
import {
  type CollectionComponentClass,
  type CollectionComponentListItem,
  createListExportAction,
  createListImportAction,
  createSupportedMapMappingFunction,
  importIntoLayer,
  makeEditorCollectionComponentClass,
  type EditorCollectionComponentClass,
  type VcsUiApp,
  type WindowComponentOptions,
  WindowSlot,
  categoryManagerWindowId,
  createZoomToFeatureAction,
} from '@vcmap/ui';
import { unByKey } from 'ol/Observable.js';
import type Feature from 'ol/Feature.js';
import Distance2D from './mode/distance2D.js';
import Position3D from './mode/position3D.js';
import Area2D from './mode/area2D.js';
import Distance3D from './mode/distance3D.js';
import ObliqueHeight from './mode/obliqueHeight.js';
import Area3D from './mode/area3D.js';
import type MeasurementMode from './mode/measurementMode.js';
import {
  doNotEditAndPersistent,
  measurementModeSymbol,
  MeasurementType,
  measurementTypeProperty,
} from './mode/measurementMode.js';
import Height3D from './mode/height3D.js';
import getMeasurementStyleFunction from './mode/styleHelper.js';
import Position2D from './mode/position2D.js';
import { name } from '../package.json';
import {
  createExportCallback,
  createHideAllAction,
  isCreateSession,
  isEditGeometrySession,
} from './util/actionHelper';
import MeasurementWindow from './windows/MeasurementWindow.vue';

export type MeasurementFeature = Feature & {
  [originalFeatureSymbol]?: MeasurementFeature;
  [measurementModeSymbol]: MeasurementMode;
  [doNotEditAndPersistent]?: boolean;
};

/**
 * Behavior
 * - toolbox is active when window is open.
 * - toolbox shows tool for current windows feature.
 * - closing the window will remove any temporary features
 * - closing the window will stop any running sessions
 * - context menu should include a select, which opens the window.
 */

export type MeasurementManager = {
  currentFeature: ShallowRef<MeasurementFeature | undefined>;
  currentSession: ShallowRef<
    EditorSession<SessionType.CREATE | SessionType.EDIT_GEOMETRY> | undefined
  >;
  currentMeasurementMode: ShallowRef<MeasurementMode | undefined>;
  readonly windowId: string;
  readonly layer: VectorLayer;
  readonly collection: Collection<MeasurementFeature>;
  startCreateSession(type: MeasurementType): Promise<void>;
  startEditSession(feature: MeasurementFeature): void;
  persistCurrentFeature(): void;
  stop(): void;
  destroy(): void;
};

function addNewFeature(
  measurementMode: MeasurementMode,
  newFeature: Feature,
): asserts newFeature is MeasurementFeature {
  const properties = measurementMode.templateFeature.getProperties();
  delete properties.geometry; // delete geometry from template properties
  newFeature.setStyle(measurementMode.templateFeature.getStyle());
  (newFeature as MeasurementFeature)[measurementModeSymbol] = measurementMode;
  if (Object.keys(properties).length) {
    newFeature.setProperties(properties);
  }
  if (measurementMode.type === MeasurementType.ObliqueHeight2D) {
    newFeature[doNotTransform] = true;
    (newFeature as MeasurementFeature)[doNotEditAndPersistent] = true;
  }
}

function createSimpleMeasurementLayer(app: VcsUiApp): {
  layer: VectorLayer;
  destroy: () => void;
} {
  const layer = new VectorLayer({
    projection: mercatorProjection.toJSON(),
    zIndex: maxZIndexMin50,
    vectorProperties: {
      eyeOffset: [0.0, 0.0, -5.0],
    },
  });
  markVolatile(layer);
  layer.activate().catch(() => {});
  app.layers.add(layer);
  const highlightStyle = new VectorStyleItem({});
  highlightStyle.style = getMeasurementStyleFunction(true);

  layer.setHighlightStyle(highlightStyle);
  layer.setStyle(getMeasurementStyleFunction(false));
  const listeners = [
    layer.getSource().on('addfeature', (event) => {
      if (event.feature) {
        app.maps.eventHandler.featureInteraction.excludeFromPickPosition(
          event.feature,
        );
      }
    }),
    layer.getSource().on('removefeature', (event) => {
      if (event.feature) {
        app.maps.eventHandler.featureInteraction.includeInPickPosition(
          event.feature,
        );
      }
    }),
  ];

  const destroy = (): void => {
    unByKey(listeners);
    layer.deactivate();
    app.layers.remove(layer);
    layer.destroy();
  };

  return { layer, destroy };
}

export function createMeasurementMode(
  measurementType: MeasurementType,
  app: VcsUiApp,
  manager: MeasurementManager,
): MeasurementMode {
  switch (measurementType) {
    case MeasurementType.Position2D:
      return new Position2D({ app, manager });
    case MeasurementType.Position3D:
      return new Position3D({ app, manager });
    case MeasurementType.Distance2D:
      return new Distance2D({ app, manager });
    case MeasurementType.Distance3D:
      return new Distance3D({ app, manager });
    case MeasurementType.Area2D:
      return new Area2D({ app, manager });
    case MeasurementType.Area3D:
      return new Area3D({ app, manager });
    case MeasurementType.Height3D:
      return new Height3D({ app, manager });
    default:
      return new ObliqueHeight({ app, manager });
  }
}

function setTitleOnFeature(
  feature: MeasurementFeature,
  layer: VectorLayer,
): void {
  const { type } = feature[measurementModeSymbol];

  const sameTypeFeaturesNames = new Set(
    layer
      .getFeatures()
      .filter(
        (f) => (f as MeasurementFeature)[measurementModeSymbol].type === type,
      )
      .map((f) => f.get('title') as string),
  );

  let featureName = '';
  let count = 1;
  while (!featureName) {
    if (!sameTypeFeaturesNames.has(`${type}-${count}`)) {
      featureName = `${type}-${count}`;
    }
    count += 1;
  }

  feature.set('title', featureName);
}

function addKeyListeners(
  session: EditorSession<SessionType.EDIT_GEOMETRY | SessionType.CREATE>,
  removeWindow: () => void,
): () => void {
  if (isCreateSession(session)) {
    const handleCreateKeys = (event: KeyboardEvent): void => {
      if (event?.target && (event.target as Element).tagName === 'INPUT') {
        return;
      }
      switch (event.code) {
        case 'Escape':
          removeWindow();
          break;
        case 'Enter':
          session.finish();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleCreateKeys);
    return () => {
      window.removeEventListener('keydown', handleCreateKeys);
    };
  } else if (isEditGeometrySession(session)) {
    function handleEditKeys(event: KeyboardEvent): void {
      if (event.target && (event.target as Element).tagName === 'INPUT') {
        return;
      }
      if (event.code === 'Escape') {
        session.stop();
      }
    }
    window.addEventListener('keydown', handleEditKeys);
    return () => {
      window.removeEventListener('keydown', handleEditKeys);
    };
  }
  return () => {};
}

function createMeasurementWindowOptions(
  app: VcsUiApp,
  id: string,
): WindowComponentOptions {
  return {
    id,
    component: MeasurementWindow,
    state: {
      headerTitle: 'measurement.header.title',
      headerIcon: '',
      styles: { height: 'auto' },
      infoUrlCallback: app.getHelpUrlCallback('tools/measurementTool.html'),
    },
  };
}

function itemMappingFunction(
  app: VcsUiApp,
  layer: VectorLayer,
  featureItem: MeasurementFeature,
  _c: CollectionComponentClass<MeasurementFeature>,
  categoryListItem: CollectionComponentListItem,
): void {
  const featureId = featureItem.getId() as string;
  categoryListItem.title = featureItem.get('title') ?? 'Object';

  let hidden = !!layer.featureVisibility.hiddenObjects[featureId];

  const hideAction = reactive({
    name: 'hideAction',
    icon: hidden ? '$vcsCheckbox' : '$vcsCheckboxChecked',
    callback(): void {
      if (!hidden) {
        layer.featureVisibility.hideObjects([featureId]);
        hidden = true;
        this.icon = '$vcsCheckbox';
      } else {
        layer.featureVisibility.showObjects([featureId]);
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
    featureItem.set('title', newTitle);
  };

  const zoomToAction = createZoomToFeatureAction(
    { name: 'measurement.category.zoomTo' },
    featureItem,
    app.maps,
  )!;

  categoryListItem.actions.push(hideAction, zoomToAction);

  categoryListItem.destroy = (): void => {
    hideListener();
  };
}

function createCollection(
  app: VcsUiApp,
  layer: VectorLayer,
  currentFeature: ShallowRef<MeasurementFeature | undefined>,
): {
  collectionComponent: EditorCollectionComponentClass<MeasurementFeature>;
  destroy: () => void;
} {
  const collection: OverrideCollection<MeasurementFeature> =
    makeOverrideCollection(
      // @ts-expect-error using private as key
      new Collection<MeasurementFeature>('id_'),
      () => app.dynamicModuleId,
      (feature) => writeGeoJSONFeature(feature),
      (item) => {
        const feature = parseGeoJSON(item).features[0];
        const type = feature.get(measurementTypeProperty) as MeasurementType;
        const measurementMode = createMeasurementMode(type, app, this);
        addNewFeature(measurementMode, feature);
        setTitleOnFeature(feature, layer);
        return feature;
      },
    );

  const collectionComponent: EditorCollectionComponentClass<MeasurementFeature> =
    makeEditorCollectionComponentClass(
      app,
      app.categoryManager.add(
        {
          id: 'simpleMeasurementCategory',
          title: 'measurement.category.title',
          collection,
          selectable: true,
          removable: true,
          renamable: true,
        },
        name,
      ),
      {
        editor: (feature) =>
          createMeasurementWindowOptions(
            app,
            collectionComponent.getEditorWindowId(feature),
          ),
        selectionBased: true,
      },
    );

  const { action: exportAction, destroy: destroyExportAction } =
    createListExportAction(
      collectionComponent.selection,
      () => {
        createExportCallback(layer, collectionComponent);
      },
      name,
    );

  const { action: importAction, destroy: destroyImportAction } =
    createListImportAction(
      async (files) => {
        const layerListener = layer
          .getSource()
          .on('addfeature', ({ feature }) => {
            const measurementType = feature?.get(measurementTypeProperty);
            if (measurementType) {
              const measurementMode = createMeasurementMode(
                measurementType,
                app,
                this,
              );
              addNewFeature(measurementMode, feature!);
              collection.add(feature);
              measurementMode
                .calcMeasurementResult(feature)
                .catch((err: unknown) => {
                  getLogger(name).error(
                    'Error calculating measurement result',
                    err,
                  );
                });
              feature.changed();
            }
          });
        await importIntoLayer(files, app, layer);
        unByKey(layerListener);
        return true;
      },
      app.windowManager,
      name,
      'category-manager',
    );

  const { action: hideAllAction, destroy: destroyHideAllAction } =
    createHideAllAction(layer, currentFeature, collectionComponent);

  collectionComponent.addActions([
    { action: hideAllAction, owner: name },
    importAction,
    exportAction,
  ]);

  collectionComponent.addItemMapping({
    mappingFunction: itemMappingFunction.bind(null, app, layer),
    owner: name,
  });

  collectionComponent.addItemMapping({
    mappingFunction: createSupportedMapMappingFunction(
      [
        CesiumMap.className,
        OpenlayersMap.className,
        ObliqueMap.className,
        PanoramaMap.className,
      ],
      app.maps,
    ),
    owner: name,
  });

  return {
    collectionComponent,
    destroy: (): void => {
      app.categoryManager.remove(collectionComponent.id);
      collection.destroy();
      destroyImportAction();
      destroyExportAction();
      destroyHideAllAction();
    },
  };
}

export function createMeasurementManager(app: VcsUiApp): MeasurementManager {
  const currentSession: ShallowRef<
    EditorSession<SessionType.CREATE | SessionType.EDIT_GEOMETRY> | undefined
  > = shallowRef();
  const currentFeature = shallowRef<MeasurementFeature | undefined>();
  const currentMeasurementMode: ShallowRef<MeasurementMode | undefined> =
    shallowRef();

  const { layer, destroy: destroyLayer } = createSimpleMeasurementLayer(app);
  const { collectionComponent, destroy: destroyCollection } = createCollection(
    app,
    layer,
    currentFeature,
  );
  const { collection } = collectionComponent;
  // @ts-expect-error selection based
  const windowId = collectionComponent.getEditorWindowId();

  const highlightSelection = (): void => {
    layer.featureVisibility.clearHighlighting();
    const toHighlight: Record<string, VectorStyleItem> = {};
    collectionComponent.selection.value.forEach((item) => {
      toHighlight[item.name] = layer.highlightStyle!;
    });
    if (currentFeature.value) {
      toHighlight[currentFeature.value.getId() as string] =
        layer.highlightStyle!;
    }
    layer.featureVisibility.highlight(toHighlight);
  };

  /**
   * re-calculates measurement result when current feature changes
   */
  let featureListener: () => void = () => {};
  const currentFeatureWatcher = watch(
    currentFeature,
    (newFeature, oldFeature) => {
      featureListener();
      if (newFeature) {
        currentMeasurementMode.value = newFeature[measurementModeSymbol];
        currentMeasurementMode.value
          .calcMeasurementResult(newFeature)
          .catch((err: unknown) => {
            getLogger(name).error('Error calculating measurement result', err);
          });
        const eventKey = newFeature.getGeometry()!.on('change', () => {
          newFeature[measurementModeSymbol]
            .calcMeasurementResult(newFeature)
            .then((updated) => {
              if (updated) newFeature.changed();
            })
            .catch((err: unknown) => {
              getLogger(name).error(
                'Error calculating measurement result',
                err,
              );
            });
        });
        featureListener = (): void => {
          unByKey(eventKey);
          featureListener = (): void => {};
        };

        const currentSelectedIds = collectionComponent.selection.value.map(
          (s) => s.name,
        );

        const currentFeatureId = newFeature.getId()!;
        if (
          !(
            currentSelectedIds.length === 1 &&
            currentSelectedIds[0] === currentFeatureId
          )
        ) {
          const listItem = collectionComponent.getListItemForItem(newFeature);
          if (listItem) {
            collectionComponent.selection.value = [listItem];
          }
        }

        if (!app.windowManager.has(windowId)) {
          app.windowManager.add(
            {
              ...createMeasurementWindowOptions(app, windowId),
              slot: WindowSlot.DYNAMIC_CHILD,
              parentId: categoryManagerWindowId,
            },
            name,
          );
        }
      } else {
        currentMeasurementMode.value = undefined;
        if (collectionComponent.selection.value.length === 1) {
          collectionComponent.selection.value = [];
        }
      }

      if (oldFeature && !collection.has(oldFeature)) {
        layer.getSource().removeFeature(oldFeature);
      }
      highlightSelection();
    },
  );

  const selectionListener = watch(
    collectionComponent.selection,
    (selection) => {
      if (selection.length === 1) {
        const selectedFeature = collection.getByKey(selection[0].name);
        if (selectedFeature && selectedFeature !== currentFeature.value) {
          currentFeature.value = selectedFeature;
        }
      } else if (currentFeature.value) {
        currentFeature.value = undefined;
      }
      highlightSelection();
    },
  );

  let obliqueMapImageChangedListener: () => void;
  function setupMapChangedListener(): () => void {
    const deleteOblique2DHeightFeature = (): void => {
      layer.removeFeaturesById(
        layer
          .getFeatures()
          .filter(
            (f) =>
              (f as MeasurementFeature)[measurementModeSymbol]?.type ===
              MeasurementType.ObliqueHeight2D,
          )
          .map((f) => f.getId()!),
      );
    };

    return app.maps.mapActivated?.addEventListener(() => {
      deleteOblique2DHeightFeature();
      if (app.maps.activeMap instanceof ObliqueMap) {
        obliqueMapImageChangedListener?.();
        obliqueMapImageChangedListener =
          app.maps.activeMap.imageChanged!.addEventListener(() => {
            deleteOblique2DHeightFeature();
          });
      }
    });
  }
  const mapChangedListener = setupMapChangedListener();

  let sessionListener = (): void => {};
  /**
   * Stops running sessions and starts a new one.
   * @param  newSession The new editor session to be started.
   */
  function setCurrentSession(
    newSession?: EditorSession<SessionType.CREATE | SessionType.EDIT_GEOMETRY>,
  ): void {
    sessionListener();

    currentSession.value?.stop?.();
    currentSession.value = newSession;

    if (currentSession.value) {
      const listeners = [
        currentSession.value.stopped.addEventListener(() => {
          setCurrentSession();
        }),
        addKeyListeners(currentSession.value, () => {
          if (app.windowManager.has(windowId)) {
            app.windowManager.remove(windowId);
          }
        }),
      ];

      if (isCreateSession(currentSession.value)) {
        listeners.push(
          currentSession.value.featureCreated.addEventListener((newFeature) => {
            addNewFeature(currentMeasurementMode.value!, newFeature);
            setTitleOnFeature(newFeature, layer);
            currentFeature.value = newFeature;
          }),
        );
      }

      sessionListener = (): void => {
        listeners.forEach((listener) => {
          listener();
        });
      };
    } else {
      sessionListener = (): void => {};
    }
  }

  const layerListener = layer.source.on('removefeature', (e) => {
    if (e.feature) {
      if (e.feature === currentFeature.value) {
        currentFeature.value = undefined;
      }
      if (collection.has(e.feature as MeasurementFeature)) {
        collection.remove(e.feature as MeasurementFeature);
      }
    }
  });

  collection.removed.addEventListener((f) => {
    layer.getSource().removeFeature(f);
  });

  return {
    currentSession,
    currentFeature,
    get layer(): VectorLayer {
      return layer;
    },
    get collection(): Collection<MeasurementFeature> {
      return collection;
    },
    get windowId(): string {
      return windowId;
    },
    currentMeasurementMode,
    async startCreateSession(measurementType): Promise<void> {
      currentFeature.value = undefined;
      await nextTick();
      currentMeasurementMode.value = createMeasurementMode(
        measurementType,
        app,
        this,
      );
      const createSession = startCreateFeatureSession(
        app,
        layer,
        currentMeasurementMode.value.geometryType,
        currentMeasurementMode.value
          .createTemplateFeature()
          .get('olcs_altitudeMode'),
        {
          hideSegmentLength: true,
        },
      );

      createSession.creationFinished.addEventListener(() => {
        setCurrentSession();
      });
      setCurrentSession(createSession);
      if (!app.windowManager.has(windowId)) {
        app.windowManager.add(
          {
            ...createMeasurementWindowOptions(app, windowId),
            slot: WindowSlot.DYNAMIC_CHILD,
            parentId: categoryManagerWindowId,
          },
          name,
        );
      }
    },
    startEditSession(feature: MeasurementFeature): void {
      const session = startEditGeometrySession(app, layer, undefined, {
        hideSegmentLength: true,
      });
      setCurrentSession(session);
      session.setFeature(feature);
      currentFeature.value = feature;
    },
    stop(): void {
      setCurrentSession();
      if (!currentFeature.value && app.windowManager.has(windowId)) {
        app.windowManager.remove(windowId);
      }
    },
    persistCurrentFeature(): void {
      if (
        currentFeature.value &&
        !collection.has(currentFeature.value) &&
        currentMeasurementMode.value
      ) {
        collection.add(currentFeature.value);
        collectionComponent.selection.value = [
          collectionComponent.getListItemForItem(currentFeature.value)!,
        ];
      }
    },
    destroy(): void {
      setCurrentSession();
      unByKey(layerListener);
      destroyLayer();
      obliqueMapImageChangedListener?.();
      mapChangedListener();
      currentFeatureWatcher();
      destroyCollection();
      featureListener();
      sessionListener();
      selectionListener();
      app.windowManager.remove(windowId);
    },
  };
}
