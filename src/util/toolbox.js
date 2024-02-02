import { watch } from 'vue';
import {
  CesiumMap,
  createSync,
  GeometryType,
  ObliqueMap,
  OpenlayersMap,
  SessionType,
} from '@vcmap/core';
import { ToolboxType } from '@vcmap/ui';
import { name } from '../../package.json';
/**
 * @enum {number}
 */
export const MeasurementType = {
  Position3D: 'Position3D',
  Distance2D: 'Distance2D',
  Area2D: 'Area2D',
  Distance3D: 'Distance3D',
  Area3D: 'Area3D',
  Height3D: 'Height3D',
  ObliqueHeight2D: 'ObliqueHeight2D',
};

/**
 * @typedef {Object} MeasurementToolbox
 * @property {import("@vcmap/ui/src/manager/toolbox/toolboxManager").SingleToolboxComponentOptions|import("@vcmap/ui/src/manager/toolbox/toolboxManager").SelectToolboxComponentOptions} toolbox
 * @property {function():void} destroy
 */

export const MeasurementTypeIcon = {
  [MeasurementType.Position3D]: '$vcsPointMeasurement',
  [MeasurementType.Distance2D]: '$vcs2dDistance',
  [MeasurementType.Area2D]: '$vcs2dArea',
  [MeasurementType.Distance3D]: '$vcs3dDistance',
  [MeasurementType.Area3D]: '$vcs3dArea',
  [MeasurementType.Height3D]: '$vcs3dHeight',
  [MeasurementType.ObliqueHeight2D]: '$vcs2dHeightOblique',
};

export const MeasurementGeometryType = {
  [MeasurementType.Position3D]: GeometryType.Point,
  [MeasurementType.Distance2D]: GeometryType.LineString,
  [MeasurementType.Area2D]: GeometryType.Polygon,
  [MeasurementType.Distance3D]: GeometryType.LineString,
  [MeasurementType.Area3D]: GeometryType.Polygon,
  [MeasurementType.Height3D]: GeometryType.LineString,
  [MeasurementType.ObliqueHeight2D]: GeometryType.LineString,
};

/**
 * @param {MeasurementManager} manager
 * @returns {MeasurementToolbox}
 */
function createCreateToolbox(manager) {
  const createCreateButton = (measurementType) => ({
    name: measurementType,
    title: `measurement.create.tooltip.${measurementType}`,
    icon: MeasurementTypeIcon[measurementType],
    geometryType: MeasurementGeometryType[measurementType],
  });

  const toolbox = {
    type: ToolboxType.SELECT,
    action: {
      name: 'creation',
      currentIndex: 1,
      active: false,
      callback() {
        if (this.active) {
          manager.stop();
        } else {
          manager.startCreateSession(this.tools[this.currentIndex].name);
        }
      },
      selected(newIndex) {
        this.currentIndex = newIndex;
        manager.startCreateSession(this.tools[this.currentIndex].name);
      },
      tools: [
        createCreateButton(MeasurementType.Position3D),
        createCreateButton(MeasurementType.Distance2D),
        createCreateButton(MeasurementType.Distance3D),
        createCreateButton(MeasurementType.Area2D),
        createCreateButton(MeasurementType.Area3D),
        createCreateButton(MeasurementType.ObliqueHeight2D),
        createCreateButton(MeasurementType.Height3D),
      ],
    },
  };

  const destroy = watch(manager.currentSession, () => {
    const currentSession = manager.currentSession.value;
    if (currentSession?.type === SessionType.SELECT) {
      toolbox.action.active = false;
    } else {
      toolbox.action.active = !!currentSession;
      if (
        toolbox.action.active &&
        currentSession?.type === SessionType.CREATE
      ) {
        const toolName = manager.currentMeasurementMode.value.type;
        const index = toolbox.action.tools.findIndex(
          (t) => t.name === toolName,
        );
        if (index >= 0 && toolbox.action.currentIndex !== index) {
          toolbox.action.currentIndex = index;
        }
      }
    }
  });

  return {
    toolbox,
    destroy,
  };
}

/**
 * @param {MeasurementManager} manager
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @returns {function():void}
 */
export function addToolButtons(manager, app) {
  const { toolbox: createToolbox, destroy: destroyCreateToolbox } =
    createCreateToolbox(manager);
  const createId = app.toolboxManager.add(createToolbox, name).id;

  function updateTools() {
    createToolbox.action.tools.forEach((tool) => {
      tool.disabled = true;
    });
    let filteredTools = [];
    const { activeMap } = app.maps;
    if (activeMap instanceof CesiumMap) {
      filteredTools = createToolbox.action.tools.filter(
        (tool) => tool.name !== MeasurementType.ObliqueHeight2D,
      );
    } else if (activeMap instanceof OpenlayersMap) {
      filteredTools = createToolbox.action.tools.filter(
        (tool) =>
          tool.name !== MeasurementType.Distance3D &&
          tool.name !== MeasurementType.Area3D &&
          tool.name !== MeasurementType.Height3D &&
          tool.name !== MeasurementType.ObliqueHeight2D,
      );
    } else if (activeMap instanceof ObliqueMap) {
      filteredTools = createToolbox.action.tools.filter(
        (tool) =>
          tool.name !== MeasurementType.Distance3D &&
          tool.name !== MeasurementType.Area3D &&
          tool.name !== MeasurementType.Height3D &&
          tool.name !== MeasurementType.Area2D &&
          tool.name !== MeasurementType.Position3D,
      );
    }
    filteredTools.forEach((tool) => {
      tool.disabled = false;
    });

    const { currentIndex } = createToolbox.action;
    if (!filteredTools.includes(createToolbox.action.tools[currentIndex])) {
      createToolbox.action.currentIndex = createToolbox.action.tools.findIndex(
        (tool) => tool.name === MeasurementType.Distance2D,
      );
    }

    if (manager.currentFeatures.value) {
      manager.currentLayer.value.removeFeaturesById(
        manager.currentFeatures.value
          .filter((f) => f[createSync])
          .map((f) => f.getId()),
      );
    }

    manager.stop();
  }
  updateTools();
  const destroyMapEventListener =
    app.maps.mapActivated.addEventListener(updateTools);

  return () => {
    app.toolboxManager.remove(createId);
    destroyCreateToolbox();
    destroyMapEventListener();
  };
}
