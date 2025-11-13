import { reactive, watch } from 'vue';
import type { GeometryType } from '@vcmap/core';
import type { SelectToolboxComponentOptions, VcsUiApp } from '@vcmap/ui';
import { ToolboxType } from '@vcmap/ui';
import { getLogger } from '@vcsuite/logger';
import { name } from '../../package.json';
import type { MeasurementPlugin } from '../index.js';
import type { MeasurementManager } from '../measurementManager.js';
import { createMeasurementMode } from '../measurementManager.js';
import {
  measurementGeometryType,
  MeasurementType,
} from '../mode/measurementMode.js';
import type { MeasurementConfig } from './configHelper';

type MeasurementToolButton = {
  name: MeasurementType;
  title: string;
  icon: string;
  geometryType: GeometryType;
};

export const measurementTypeIcon = {
  [MeasurementType.Position3D]: '$vcs3dPoint',
  [MeasurementType.Position2D]: '$vcs2dPoint',
  [MeasurementType.Distance2D]: '$vcs2dDistance',
  [MeasurementType.Area2D]: '$vcs2dArea',
  [MeasurementType.Distance3D]: '$vcs3dDistance',
  [MeasurementType.Area3D]: '$vcs3dArea',
  [MeasurementType.Height3D]: '$vcs3dHeight',
  [MeasurementType.ObliqueHeight2D]: '$vcs2dHeightOblique',
};

function createCreateButton(
  measurementType: MeasurementType,
): MeasurementToolButton {
  return {
    name: measurementType,
    title: `measurement.create.tooltip.${measurementType}`,
    icon: measurementTypeIcon[measurementType],
    geometryType: measurementGeometryType[measurementType],
  };
}

export function addToolButtons(
  manager: MeasurementManager,
  app: VcsUiApp,
): () => void {
  const { config } = app.plugins.getByKey(name) as MeasurementPlugin;

  function isActive(): boolean {
    return app.windowManager.has(manager.windowId);
  }

  function isDisabled(): boolean {
    return app.maps.activeMap
      ? config[app.maps.activeMap.className as keyof MeasurementConfig]?.disable
      : true;
  }

  const toolbox: SelectToolboxComponentOptions = {
    type: ToolboxType.SELECT,
    action: reactive({
      name: 'creation',
      currentIndex: 0,
      active: isActive(),
      disabled: isDisabled(),
      callback(): void {
        if (isActive()) {
          app.windowManager.remove(manager.windowId);
        } else {
          manager
            .startCreateSession(this.tools[this.currentIndex].name)
            .catch((err: unknown) => {
              getLogger(name).error('Error starting create session ', err);
            });
        }
      },
      selected(newIndex: number): void {
        this.currentIndex = newIndex;
        manager
          .startCreateSession(this.tools[this.currentIndex].name)
          .catch((err: unknown) => {
            getLogger(name).error('Error starting create session ', err);
          });
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
  const createId = app.toolboxManager.add(toolbox, name).id;
  function updateTools(): void {
    toolbox.action.tools.forEach((tool) => {
      tool.disabled = true;
    });
    const disabled = isDisabled();
    toolbox.action.disabled = disabled;
    if (!disabled) {
      const filteredTools = toolbox.action.tools.filter((tool) => {
        return createMeasurementMode(
          tool.name as MeasurementType,
          app,
          manager,
        )?.supportedMaps.includes(app.maps.activeMap!.className);
      });

      filteredTools.forEach((tool) => {
        tool.disabled = false;
      });

      toolbox.action.disabled = filteredTools.length === 0;

      const { currentIndex } = toolbox.action;
      if (!filteredTools.includes(toolbox.action.tools[currentIndex])) {
        toolbox.action.currentIndex = toolbox.action.tools.findIndex(
          (tool) => !tool.disabled,
        );
      }
    }

    manager.currentFeature.value = undefined;
    manager.stop();
  }
  updateTools();

  const listeners = [
    app.maps.mapActivated.addEventListener(updateTools),
    app.windowManager.added.addEventListener(() => {
      toolbox.action.active = isActive();
    }),
    app.windowManager.removed.addEventListener(() => {
      toolbox.action.active = isActive();
    }),
    watch(
      manager.currentMeasurementMode,
      (mode) => {
        if (mode) {
          const toolName = mode.type;
          const index = toolbox.action.tools.findIndex(
            (t) => (t.name as MeasurementType) === toolName,
          );
          if (index >= 0 && toolbox.action.currentIndex !== index) {
            toolbox.action.currentIndex = index;
          }
        }
      },
      { immediate: true },
    ),
  ];

  return () => {
    app.toolboxManager.remove(createId);
    listeners.forEach((l) => {
      l();
    });
  };
}
