import { watch, shallowRef } from 'vue';
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
} from '@vcmap/core';
import { unByKey } from 'ol/Observable.js';
import Distance2D from './mode/distance2D.js';
import { MeasurementType } from './util/toolbox.js';
import Position3D from './mode/position3D.js';
import Area2D from './mode/area2D.js';
import Distance3D from './mode/distance3D.js';
import ObliqueHeight from './mode/obliqueHeight.js';
import Area3D from './mode/area3D.js';
import { measurementModeSymbol } from './mode/measurementMode.js';
import Height3D from './mode/height3D.js';

/**
 * @typedef {Object} MeasurementManager
 * @property {import("vue").ShallowRef<null|import("@vcmap/core").EditorSession>} currentSession
 * @property {import("vue").ShallowRef<null|import("@vcmap/core").EditorSession>} currentEditSession
 * @property {import("vue").ShallowRef<Array<import("ol").Feature>>} currentFeatures
 * @property {import("vue").ShallowRef<import("@vcmap/core").VectorLayer>} currentLayer
 * @property {function(import("@vcmap/core").GeometryType):void} startCreateSession
 * @property {function(import("ol").Feature[]=):void} startSelectSession - optional features to select
 * @property {function(import("ol").Feature=):void} startEditSession - optional feature to select
 * @property {function(import("@vcmap/core").TransformationMode):void} startTransformSession
 * @property {function():import("@vcmap/core").VectorLayer} getDefaultLayer
 * @property {function():void} placeCurrentFeaturesOnTerrain - Places features on top of the terrain. When multiple features are selected, the relative position is not changed.
 * @property {function():void} stop
 * @property {function():void} stopEditing
 * @property {function():void} destroy
 */

export const selectInteractionId = 'select_interaction_id';

/**
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @returns {import("@vcmap/core").VectorLayer}
 */
function createSimpleMeasurementLayer(app) {
  const layer = new VectorLayer({
    projection: mercatorProjection.toJSON(),
    zIndex: maxZIndex - 1,
  });
  markVolatile(layer);
  layer.activate();
  app.layers.add(layer);
  return layer;
}

/**
 * @param {import("@vcmap/core").VcsApp} app
 * @param {import("@vcmap/core").EditorSession} session
 * @param {import("vue").ShallowRef<Array<import("ol").Feature>>} currentFeatures
 * @param {import("@vcmap/core").VectorLayer} layer
 * @param {import("mode/measurementMode").ShallowRef<MeasurementMode>} currentMeasurementMode
 * @param {import("vue").ShallowRef<Object>} currentValues
 * @param {Object} featureListeners
 * @returns {function():void}
 */
function setupSessionListener(
  app,
  session,
  currentFeatures,
  layer,
  currentMeasurementMode,
  currentValues,
  featureListeners,
) {
  const listeners = [];
  if (session.type === SessionType.SELECT) {
    listeners.push(
      session.featuresChanged.addEventListener((features) => {
        currentFeatures.value = features;
        if (features.length === 1) {
          const feature = features[0];
          currentMeasurementMode.value = feature[measurementModeSymbol];
          currentValues.value = feature[measurementModeSymbol].values;
          currentMeasurementMode.value.calcMeasurementResult(feature);
        }
      }),
    );
  }

  if (session.type === SessionType.CREATE) {
    listeners.push(
      session.featureCreated.addEventListener((newFeature) => {
        currentFeatures.value = [newFeature];
        const properties =
          currentMeasurementMode.value.templateFeature.getProperties();
        delete properties.geometry; // delete geometry from template properties
        newFeature.setStyle(
          currentMeasurementMode.value.templateFeature.getStyle(),
        );
        newFeature[measurementModeSymbol] = currentMeasurementMode.value;
        if (Object.keys(properties).length) {
          newFeature.setProperties(properties);
        }
        currentMeasurementMode.value.calcMeasurementResult(newFeature);
        currentValues.value = currentMeasurementMode.value.values;
        featureListeners[newFeature.getId()] = newFeature
          .getGeometry()
          .on('change', () => {
            currentMeasurementMode.value
              .calcMeasurementResult(newFeature)
              .then((updated) => {
                if (updated) newFeature.changed();
              });
          });
      }),
    );
  }

  return () => {
    listeners.forEach((l) => l());
  };
}

/**
 * Creates listeners that listen to select session changes and apply these to the edit sessions.
 * @param {import("@vcmap/core").SelectFeaturesSession} selectSession
 * @param {import("@vcmap/core").EditFeaturesSession | import("@vcmap/core").EditGeometrySession} editSession
 * @returns {function():void} Remove listeners
 */
function setupEditSessionListeners(selectSession, editSession) {
  let updateFeatures;
  if (editSession.type === SessionType.EDIT_GEOMETRY) {
    updateFeatures = (newFeatures) => {
      editSession.setFeature(newFeatures[0]);
    };
  }
  const featuresChangesListener =
    selectSession.featuresChanged.addEventListener(updateFeatures);
  const stopListener = selectSession.stopped.addEventListener(editSession.stop);

  return () => {
    featuresChangesListener();
    stopListener();
  };
}

/**
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @returns {MeasurementManager}
 */
export function createMeasurementManager(app) {
  /** @type {import('vue').ShallowRef<import('@vcmap/core').EditorSession | null>} */
  const currentSession = shallowRef(null);
  /** @type {import('vue').ShallowRef<import('@vcmap/core').EditorSession | null>} */
  const currentEditSession = shallowRef(null);
  const currentFeatures = shallowRef();
  const currentMeasurementMode = shallowRef(null);
  const currentValues = shallowRef({});

  const category = shallowRef(null);

  const layer = createSimpleMeasurementLayer(app);
  const currentLayer = shallowRef(layer);
  let sessionListener = () => {};
  let editSessionListener = () => {};
  let sessionStoppedListener = () => {};
  let editSessionStoppedListener = () => {};

  const featureListeners = {};

  /**
   * Stops running sessions and starts a new one.
   * @param {import('@vcmap/core').EditorSession | null} newSession The new editor session to be started.
   */
  function setCurrentSession(newSession) {
    sessionStoppedListener();
    sessionListener();

    currentFeatures.value = [];
    currentSession.value?.stop?.();

    currentSession.value = newSession;
    if (currentSession.value) {
      sessionStoppedListener =
        currentSession.value.stopped.addEventListener(setCurrentSession);

      sessionListener = setupSessionListener(
        app,
        currentSession.value,
        currentFeatures,
        currentLayer.value,
        currentMeasurementMode,
        currentValues,
        featureListeners,
      );
    } else {
      sessionStoppedListener = () => {};
      sessionListener = () => {};
    }
  }

  /**
   * Sets a new edit sesstion (either features or geometry) and makes sure that the current edit session is stopped and there is a selection session running.
   * @param {import("@vcmap/core").EditFeaturesSession | import("@vcmap/core").EditGeometrySession | null} newSession
   */
  function setCurrentEditSession(newSession) {
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
          ),
        );
      } else {
        currentSession.value.setMode(selectionMode);
      }
      editSessionStoppedListener =
        currentEditSession.value.stopped.addEventListener(
          setCurrentEditSession,
        );
      editSessionListener = setupEditSessionListeners(
        currentSession.value,
        currentEditSession.value,
      );
    } else {
      editSessionStoppedListener = () => {};
      editSessionListener = () => {};
    }
  }

  const layerWatcher = watch(currentLayer, () => {
    setCurrentSession(null);
    if (!currentLayer.value) {
      currentLayer.value = layer;
    }
  });

  const layerListener = currentLayer.value.source.on('removefeature', (e) => {
    const id = e.feature.getId();
    const featureListener = featureListeners[id];
    if (featureListener) {
      unByKey(featureListener);
      delete featureListeners[id];
    }
  });

  return {
    category,
    currentSession,
    currentEditSession,
    currentFeatures,
    currentLayer,
    currentMeasurementMode,
    currentValues,
    startCreateSession(measurementType) {
      if (measurementType === MeasurementType.Position3D) {
        currentMeasurementMode.value = new Position3D({ app, manager: this });
      } else if (measurementType === MeasurementType.Distance2D) {
        currentMeasurementMode.value = new Distance2D({ app, manager: this });
      } else if (measurementType === MeasurementType.Distance3D) {
        currentMeasurementMode.value = new Distance3D({ app, manager: this });
      } else if (measurementType === MeasurementType.Area2D) {
        currentMeasurementMode.value = new Area2D({ app, manager: this });
      } else if (measurementType === MeasurementType.Area3D) {
        currentMeasurementMode.value = new Area3D({ app, manager: this });
      } else if (measurementType === MeasurementType.ObliqueHeight2D) {
        currentMeasurementMode.value = new ObliqueHeight({
          app,
          manager: this,
        });
      } else if (measurementType === MeasurementType.Height3D) {
        currentMeasurementMode.value = new Height3D({ app, manager: this });
      }

      setCurrentSession(
        startCreateFeatureSession(
          app,
          currentLayer.value,
          currentMeasurementMode.value.geometryType,
        ),
      );
    },
    startSelectSession(features) {
      setCurrentSession(
        startSelectFeaturesSession(
          app,
          currentLayer.value,
          selectInteractionId,
          undefined,
        ),
      );
      if (features) {
        currentSession.value?.setCurrentFeatures(features);
      }
    },
    startEditSession(feature) {
      setCurrentEditSession(
        startEditGeometrySession(app, currentLayer.value, selectInteractionId),
      );
      if (feature) {
        // set the feature at the selectFeatureSession
        currentSession.value?.setCurrentFeatures(feature);
        feature[measurementModeSymbol].calcMeasurementResult(feature);
        currentValues.value = feature[measurementModeSymbol].values;
      } else {
        currentEditSession.value?.setFeature(
          currentSession.value?.firstFeature,
        );
      }
    },
    stop() {
      setCurrentSession(null);
      setCurrentEditSession(null);
    },
    stopEditing() {
      setCurrentEditSession(null);
      if (currentSession?.value?.type === SessionType.SELECT) {
        currentSession.value.setMode(SelectionMode.MULTI);
      }
    },
    getDefaultLayer() {
      return layer;
    },
    destroy() {
      setCurrentSession(null);
      layerWatcher();
      unByKey(layerListener);
      app.layers.remove(layer);
      layer.destroy();
    },
  };
}