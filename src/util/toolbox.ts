import { reactive, watch } from 'vue';
import { GeometryType, SessionType } from '@vcmap/core';
import {
  SelectToolboxComponentOptions,
  ToolboxType,
  VcsUiApp,
} from '@vcmap/ui';
import { name } from '../../package.json';
import {
  createMeasurementMode,
  MeasurementManager,
} from '../measurementManager.js';
import {
  MeasurementGeometryType,
  MeasurementType,
} from '../mode/measurementMode.js';

type MeasurementToolbox = {
  toolbox: SelectToolboxComponentOptions;
  destroy: () => void;
};

type MeasurementToolButton = {
  name: MeasurementType;
  title: string;
  icon: string;
  geometryType: GeometryType;
};

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

function createCreateToolbox(manager: MeasurementManager): MeasurementToolbox {
  const createCreateButton = (
    measurementType: MeasurementType,
  ): MeasurementToolButton => ({
    name: measurementType,
    title: `measurement.create.tooltip.${measurementType}`,
    icon: MeasurementTypeIcon[measurementType],
    geometryType: MeasurementGeometryType[measurementType],
  });

  const toolbox: SelectToolboxComponentOptions = {
    type: ToolboxType.SELECT,
    action: reactive({
      name: 'creation',
      currentIndex: 0,
      active: false,
      callback(): void {
        if (this.active) {
          manager.stop();
        } else {
          manager.startCreateSession(this.tools[this.currentIndex].name);
        }
      },
      selected(newIndex: number): void {
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
    }),
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
        const toolName = manager.currentMeasurementMode.value!.type;
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

export function addToolButtons(
  manager: MeasurementManager,
  app: VcsUiApp,
): () => void {
  const { toolbox: createToolbox, destroy: destroyCreateToolbox } =
    createCreateToolbox(manager);
  const createId = app.toolboxManager.add(createToolbox, name).id;

  function updateTools(): void {
    createToolbox.action.tools.forEach((tool) => {
      tool.disabled = true;
    });

    const filteredTools = createToolbox.action.tools.filter((tool) => {
      return createMeasurementMode(
        tool.name as MeasurementType,
        app,
        manager,
      )?.supportedMaps.includes(app.maps.activeMap!.className);
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
              !manager.category?.collection.hasKey(f.getId()!) &&
              manager.currentSession.value?.type === SessionType.CREATE,
          )
          .map((f) => f.getId()!),
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
