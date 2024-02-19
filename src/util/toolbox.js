import { watch } from 'vue';
import { SessionType } from '@vcmap/core';
import { ToolboxType } from '@vcmap/ui';
import { name } from '../../package.json';
import { createMeasurementMode } from '../measurementManager.js';
import {
  MeasurementGeometryType,
  MeasurementType,
} from '../mode/measurementMode.js';

/**
 * @typedef {Object} MeasurementToolbox
 * @property {import("@vcmap/ui/src/manager/toolbox/toolboxManager").SingleToolboxComponentOptions|import("@vcmap/ui/src/manager/toolbox/toolboxManager").SelectToolboxComponentOptions} toolbox
 * @property {function():void} destroy
 */

export const MeasurementTypeIcon = {
  [MeasurementType.Position3D]: '$vcs3dPoint',
  [MeasurementType.Position2D]: '$vcs2dPoint',
  [MeasurementType.Distance2D]: '$vcs2dDistance',
  [MeasurementType.Area2D]: '$vcs2dArea',
  [MeasurementType.Distance3D]: '$vcs3dDistance',
  [MeasurementType.Area3D]: '$vcs3dArea',
  [MeasurementType.Height3D]: '$vcs3dHeight',
  [MeasurementType.ObliqueHeight2D]: '$vcs2dHeightOblique',
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
        createCreateButton(MeasurementType.Position2D),
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

    const filteredTools = createToolbox.action.tools.filter((tool) => {
      return createMeasurementMode(
        tool.name,
        app,
        manager,
      )?.supportedMaps.includes(app.maps.activeMap?.className);
    });

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
        manager.currentLayer.value
          .getFeatures()
          .filter(
            (f) =>
              !manager.category.value.collection.hasKey(f.getId()) &&
              manager.currentSession.value?.type === SessionType.CREATE,
          )
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
