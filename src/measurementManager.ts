import { watch, shallowRef, ShallowRef } from 'vue';
import {
  SelectionMode,
  startCreateFeatureSession,
  startEditGeometrySession,
  startSelectFeaturesSession,
  SessionType,
  VectorLayer,
  mercatorProjection,
  markVolatile,
  maxZIndex,
  VectorStyleItem,
  ObliqueMap,
  doNotTransform,
  EditorSession,
  SelectFeaturesSession,
  EditFeaturesSession,
  EditGeometrySession,
  CreateFeatureSession,
} from '@vcmap/core';
import { VcsUiApp } from '@vcmap/ui';
import { unByKey } from 'ol/Observable.js';
import Feature from 'ol/Feature.js';
import Distance2D from './mode/distance2D.js';
import Position3D from './mode/position3D.js';
import Area2D from './mode/area2D.js';
import Distance3D from './mode/distance3D.js';
import ObliqueHeight from './mode/obliqueHeight.js';
import Area3D from './mode/area3D.js';
import MeasurementMode, {
  doNotEditAndPersistent,
  MeasurementGeometryType,
  measurementModeSymbol,
  MeasurementType,
  measurementTypeProperty,
} from './mode/measurementMode.js';
import Height3D from './mode/height3D.js';
import getMeasurementStyleFunction from './mode/styleHelper.js';
import Position2D from './mode/position2D.js';
import SimpleMeasurementCategory from './category/simpleCategory.js';

export type MeasurementManager = {
  category: SimpleMeasurementCategory | undefined;
  currentMeasurementMode: ShallowRef<MeasurementMode | undefined>;
  currentSession: ShallowRef<EditorSession<SessionType> | undefined>;
  currentEditSession: ShallowRef<
    | EditorSession<SessionType.EDIT_FEATURES | SessionType.EDIT_GEOMETRY>
    | undefined
  >;
  currentFeatures: ShallowRef<Array<Feature>>;
  currentLayer: ShallowRef<VectorLayer>;
  addMeasurement: (feature: Feature) => void;
  startCreateSession: (type: MeasurementType) => void;
  startSelectSession: (features: Feature[]) => void;
  startEditSession: (feature: Feature) => void;
  getDefaultLayer: () => VectorLayer;
  stop: () => void;
  stopEditing: () => void;
  destroy: () => void;
};

export const selectInteractionId = 'select_interaction_id';

function createSimpleMeasurementLayer(app: VcsUiApp): VectorLayer {
  const layer = new VectorLayer({
    projection: mercatorProjection.toJSON(),
    zIndex: maxZIndex - 1,
    vectorProperties: {
      eyeOffset: [0.0, 0.0, -5.0],
    },
  });
  markVolatile(layer);
  layer.activate().catch(() => {});
  app.layers.add(layer);
  return layer;
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

function addNewFeature(
  measurementMode: MeasurementMode,
  featureListeners: object,
  newFeature: Feature,
): void {
  const properties = measurementMode.templateFeature.getProperties();
  delete properties.geometry; // delete geometry from template properties
  newFeature.setStyle(measurementMode.templateFeature.getStyle());
  newFeature[measurementModeSymbol] = measurementMode;
  if (Object.keys(properties).length) {
    newFeature.setProperties(properties);
  }
  if (measurementMode.type === MeasurementType.ObliqueHeight2D) {
    newFeature[doNotTransform] = true;
    newFeature[doNotEditAndPersistent] = true;
  }
  // eslint-disable-next-line
  // @ts-ignore
  featureListeners[newFeature.getId()!] = newFeature
    .getGeometry()
    .on('change', (): void => {
      // eslint-disable-next-line no-void
      void measurementMode.calcMeasurementResult(newFeature).then((updated) => {
        if (updated) newFeature.changed();
      });
    });
}

function setupSessionListener(
  _app: VcsUiApp,
  session: EditorSession<SessionType>,
  currentFeatures: ShallowRef<Array<Feature>>,
  _layer: VectorLayer,
  currentMeasurementMode: ShallowRef<MeasurementMode>,
  featureListeners: object,
): () => void {
  const listeners: Array<() => void> = [];
  if (session.type === SessionType.SELECT) {
    listeners.push(
      (session as SelectFeaturesSession).featuresChanged.addEventListener(
        (features) => {
          currentFeatures.value = features;
          if (features.length === 1) {
            const feature = features[0];
            currentMeasurementMode.value = feature[measurementModeSymbol];
            // eslint-disable-next-line no-void
            void currentMeasurementMode.value.calcMeasurementResult(feature);
          }
        },
      ),
    );
  }

  if (session.type === SessionType.CREATE) {
    const sessionType =
      MeasurementGeometryType[currentMeasurementMode.value.type];
    listeners.push(
      (
        session as CreateFeatureSession<typeof sessionType>
      ).featureCreated.addEventListener((newFeature) => {
        currentFeatures.value = [newFeature];
        addNewFeature(
          currentMeasurementMode.value,
          featureListeners,
          newFeature,
        );
        // eslint-disable-next-line no-void
        void currentMeasurementMode.value.calcMeasurementResult(newFeature);
      }),
    );
  }

  return () => {
    listeners.forEach((l) => l());
  };
}

/**
 * Creates listeners that listen to select session changes and apply these to the edit sessions.
 */
function setupEditSessionListeners(
  selectSession: SelectFeaturesSession,
  editSession: EditFeaturesSession | EditGeometrySession,
): () => void {
  if (editSession.type !== SessionType.EDIT_GEOMETRY) {
    return () => {};
  }
  const updateFeatures = (newFeatures: Feature[]): void => {
    editSession.setFeature(newFeatures[0]);
  };
  const featuresChangesListener =
    selectSession.featuresChanged.addEventListener(updateFeatures);
  const stopListener = selectSession.stopped.addEventListener(() =>
    editSession.stop(),
  );

  return () => {
    featuresChangesListener();
    stopListener();
  };
}

export function createMeasurementManager(app: VcsUiApp): MeasurementManager {
  const currentSession: ShallowRef<EditorSession<SessionType> | undefined> =
    shallowRef();
  const currentEditSession: ShallowRef<
    | EditorSession<SessionType.EDIT_FEATURES | SessionType.EDIT_GEOMETRY>
    | undefined
  > = shallowRef();
  const currentFeatures = shallowRef();
  const currentMeasurementMode: ShallowRef<MeasurementMode | undefined> =
    shallowRef();

  let category: SimpleMeasurementCategory | undefined;

  const layer = createSimpleMeasurementLayer(app);

  const highlightStyle = new VectorStyleItem({});
  highlightStyle.style = getMeasurementStyleFunction(true);

  layer.setStyle(getMeasurementStyleFunction(false));

  const currentLayer = shallowRef(layer);
  let sessionListener = (): void => {};
  let editSessionListener = (): void => {};
  let createSessionListener = (): void => {};
  let sessionStoppedListener = (): void => {};
  let editSessionStoppedListener = (): void => {};

  const featureListeners = {};

  let obliqueMapImageChangedListener: () => void;
  function setupMapChangedListener(): () => void {
    const deleteOblique2DHeightFeature = (): void | (() => void) =>
      layer.removeFeaturesById(
        layer
          .getFeatures()
          .filter(
            (f) =>
              f[measurementModeSymbol]?.type ===
              MeasurementType.ObliqueHeight2D,
          )
          .map((f) => f.getId()!),
      );

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

  /**
   * Stops running sessions and starts a new one.
   * @param  newSession The new editor session to be started.
   */
  function setCurrentSession(newSession?: EditorSession<SessionType>): void {
    sessionStoppedListener();
    sessionListener();

    if (currentFeatures.value?.length !== 0) {
      currentFeatures.value = [];
    }
    currentSession.value?.stop?.();

    currentSession.value = newSession;
    if (currentSession.value) {
      sessionStoppedListener = currentSession.value.stopped.addEventListener(
        () => setCurrentSession(),
      );

      sessionListener = setupSessionListener(
        app,
        currentSession.value,
        currentFeatures,
        currentLayer.value,
        currentMeasurementMode as ShallowRef<MeasurementMode>,
        featureListeners,
      );
    } else {
      sessionStoppedListener = (): void => {};
      sessionListener = (): void => {};
    }
  }

  /**
   * Sets a new edit sesstion (either features or geometry) and makes sure that the current edit session is stopped and there is a selection session running.
   */
  function setCurrentEditSession(
    newSession?: EditFeaturesSession | EditGeometrySession,
  ): void {
    editSessionStoppedListener();
    editSessionListener();
    currentEditSession.value?.stop?.();
    currentEditSession.value = newSession;
    if (newSession) {
      const selectionMode =
        newSession.type === SessionType.EDIT_GEOMETRY
          ? SelectionMode.SINGLE
          : SelectionMode.MULTI;
      if (!(currentSession.value?.type === SessionType.SELECT)) {
        setCurrentSession(
          startSelectFeaturesSession(
            app,
            currentLayer.value,
            selectInteractionId,
            selectionMode,
            highlightStyle,
          ),
        );
      } else {
        (currentSession.value as SelectFeaturesSession).setMode(selectionMode);
      }
      editSessionStoppedListener =
        currentEditSession.value!.stopped.addEventListener(() =>
          setCurrentEditSession(),
        );
      editSessionListener = setupEditSessionListeners(
        currentSession.value as SelectFeaturesSession,
        currentEditSession.value as EditFeaturesSession | EditGeometrySession,
      );
    } else {
      editSessionStoppedListener = (): void => {};
      editSessionListener = (): void => {};
    }
  }

  const layerWatcher = watch(currentLayer, () => {
    setCurrentSession();
    if (!currentLayer.value) {
      currentLayer.value = layer;
    }
  });

  const layerListener = currentLayer.value.source.on('removefeature', (e) => {
    const id = e.feature!.getId()!;
    // eslint-disable-next-line
    // @ts-ignore
    const featureListener = featureListeners[id];
    if (featureListener) {
      unByKey(featureListener);
      // eslint-disable-next-line
      // @ts-ignore
      delete featureListeners[id];
    }
  });

  return {
    get category(): SimpleMeasurementCategory | undefined {
      return category;
    },
    set category(value) {
      category = value;
    },
    currentSession,
    currentEditSession,
    currentFeatures,
    currentLayer,
    currentMeasurementMode,
    startCreateSession(measurementType): void {
      currentMeasurementMode.value = createMeasurementMode(
        measurementType,
        app,
        this,
      );

      currentLayer.value.getFeatures().forEach((f) => {
        if (!category?.collection.hasKey(f.getId())) {
          currentLayer.value.removeFeaturesById([f.getId()!]);
        }
      });

      createSessionListener();
      const createSession = startCreateFeatureSession(
        app,
        currentLayer.value,
        currentMeasurementMode.value.geometryType,
        currentMeasurementMode.value
          .createTemplateFeature()
          .get('olcs_altitudeMode'),
        {
          hideSegmentLength: true,
        },
      );
      createSessionListener = createSession.creationFinished.addEventListener(
        (newFeature) => {
          if (newFeature) {
            let stopped = false;
            const stopListener = createSession.stopped.addEventListener(() => {
              stopListener();
              stopped = true;
            });

            setTimeout(() => {
              if (!stopped) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                this.startSelectSession([newFeature]);
              }
            }, 0);
          }
        },
      );
      setCurrentSession(createSession);
    },
    startSelectSession(features: Feature[]): void {
      setCurrentSession(
        startSelectFeaturesSession(
          app,
          currentLayer.value,
          selectInteractionId,
          undefined,
          highlightStyle,
        ),
      );
      if (features) {
        // eslint-disable-next-line no-void
        void (currentSession.value as SelectFeaturesSession).setCurrentFeatures(
          features,
        );
      }
    },
    startEditSession(feature: Feature): void {
      setCurrentEditSession(
        startEditGeometrySession(app, currentLayer.value, selectInteractionId, {
          hideSegmentLength: true,
        }),
      );
      if (feature) {
        // set the feature at the selectFeatureSession
        // eslint-disable-next-line no-void
        void (currentSession.value as SelectFeaturesSession).setCurrentFeatures(
          [feature],
        );
        // eslint-disable-next-line no-void
        void (
          feature[measurementModeSymbol] as MeasurementMode
        ).calcMeasurementResult(feature);
      } else {
        (currentEditSession.value as EditGeometrySession).setFeature(
          (currentSession.value as SelectFeaturesSession)?.firstFeature ||
            undefined,
        );
      }
    },
    addMeasurement(feature: Feature): void {
      const measurementType = feature?.get(measurementTypeProperty);
      if (measurementType) {
        const measurementMode = createMeasurementMode(
          measurementType,
          app,
          this,
        );
        addNewFeature(measurementMode, featureListeners, feature);
        if (category) {
          category.addToCollection(feature);
        }
        // eslint-disable-next-line no-void
        void measurementMode.calcMeasurementResult(feature);
        feature.changed();
      }
    },
    stop(): void {
      setCurrentSession();
      setCurrentEditSession();
    },
    stopEditing(): void {
      setCurrentEditSession();
      if (currentSession?.value?.type === SessionType.SELECT) {
        (currentSession.value as SelectFeaturesSession).setMode(
          SelectionMode.MULTI,
        );
      }
    },
    getDefaultLayer(): VectorLayer {
      return layer;
    },
    destroy(): void {
      setCurrentSession();
      layerWatcher();
      unByKey(layerListener);
      app.layers.remove(layer);
      layer.destroy();
      obliqueMapImageChangedListener?.();
      mapChangedListener();
    },
  };
}
