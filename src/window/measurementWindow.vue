<template>
  <v-sheet v-if="values">
    <VcsFormSection
      :heading="`measurement.create.${values.type}`"
      :header-actions="editActions"
    >
      <!--point measurement block-->
      <VcsDataTable
        :items="values.vertexPositions"
        item-key="id"
        :headers="headers"
        :show-searchbar="false"
        v-if="
          values.type === MeasurementType.Position3D ||
          values.type === MeasurementType.Position2D
        "
      >
      </VcsDataTable>
      <!--distance measurement block-->
      <div
        v-if="
          values.type === MeasurementType.Distance2D ||
          values.type === MeasurementType.Distance3D
        "
      >
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.distance') }} </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.distance }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.distance!)]"
            />
          </v-col>
        </v-row>
      </div>
      <!--area measurement block-->
      <div
        v-if="
          values.type === MeasurementType.Area2D ||
          values.type === MeasurementType.Area3D
        "
      >
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.area') }} </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.area }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.area!)]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t(`measurement.value.circumference`) }} </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.circumference }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.circumference!)]"
            />
          </v-col>
        </v-row>
      </div>
      <!--2D height measurement block-->
      <div v-if="values.type === MeasurementType.ObliqueHeight2D">
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.height') }} </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.height }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.height!)]"
            />
          </v-col>
        </v-row>
      </div>
      <!--oblique measurement hint-->
      <div v-if="activeMapClassName === 'ObliqueMap'">
        <v-row
          no-gutters
          class="py-2 px-2"
          v-if="values.type === MeasurementType.Distance2D"
        >
          {{ $t('measurement.hint.oblique.distance') }}
        </v-row>
        <v-row
          no-gutters
          class="py-2 px-2"
          v-if="values.type === MeasurementType.ObliqueHeight2D"
        >
          {{ $t('measurement.hint.oblique.height') }}
        </v-row>
      </div>
      <!--3D height measurement block-->
      <div v-if="values.type === MeasurementType.Height3D">
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.height') }} [h] </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.height }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.height!)]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel>
              {{ $t('measurement.value.horizontalDistance') }} [dh]
            </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.horizontal }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.horizontal!)]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.distance') }} [d] </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.distance }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.distance!)]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.alpha') }} [α] </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.alpha }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.alpha!)]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.beta') }} [β] </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.beta }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.beta!)]"
            />
          </v-col>
        </v-row>
        <VcsFormSection :expandable="true" heading="Sketch" v-if="sketchIcon">
          <v-img :src="sketchIcon" alt="plugin-icon" />
        </VcsFormSection>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.heightPoint') }} </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.heightAltitude }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.heightAltitude!)]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters class="py-0 px-1">
          <v-col>
            <VcsLabel> {{ $t('measurement.value.groundPoint') }} </VcsLabel>
          </v-col>
          <v-col class="d-flex justify-end">
            <VcsLabel>
              {{ values.groundAltitude }}
            </VcsLabel>
            <VcsActionButtonList
              class="px-1"
              :actions="[getCopyAction(values.groundAltitude!)]"
            />
          </v-col>
        </v-row>
      </div>
    </VcsFormSection>
    <VcsFormSection
      :heading="`measurement.value.points`"
      v-if="
        values.type === MeasurementType.Distance2D ||
        values.type === MeasurementType.Distance3D
      "
    >
      <VcsDataTable
        :items="values.vertexPositions"
        item-key="id"
        :headers="headers"
        :show-searchbar="false"
      >
      </VcsDataTable>
    </VcsFormSection>
    <div class="d-flex w-full justify-space-between px-2 pt-2 pb-1">
      <VcsFormButton
        @click="addToCategory"
        icon="$vcsComponentsPlus"
        :disabled="isPersistent || isInCreation || !isEditable"
        :tooltip="$t('measurement.create.tooltip.addToWorkspace')"
      />
      <VcsFormButton
        @click="createNewMeasurement"
        variant="filled"
        :disabled="!isMapSupported"
      >
        {{ $t('measurement.create.new') }}
      </VcsFormButton>
    </div>
  </v-sheet>
</template>

<script lang="ts">
  import {
    VcsDataTable,
    VcsFormSection,
    VcsLabel,
    VcsActionButtonList,
    VcsFormButton,
    getPluginAssetUrl,
    VcsUiApp,
    VcsAction,
    WindowState,
  } from '@vcmap/ui';
  import { VRow, VCol, VSheet, VImg } from 'vuetify/components';
  import {
    inject,
    ref,
    watch,
    computed,
    onUnmounted,
    shallowRef,
    defineComponent,
    Ref,
    ShallowRef,
  } from 'vue';
  import { SelectFeaturesSession, SessionType } from '@vcmap/core';
  import Feature from 'ol/Feature.js';
  import { MeasurementManager } from '../measurementManager.js';
  import MeasurementMode, {
    doNotEditAndPersistent,
    measurementModeSymbol,
    MeasurementType,
  } from '../mode/measurementMode.js';
  import { name } from '../../package.json';

  export default defineComponent({
    name: 'MeasurementWindow',
    components: {
      VcsDataTable,
      VcsFormSection,
      VcsLabel,
      VcsActionButtonList,
      VcsFormButton,
      VRow,
      VCol,
      VSheet,
      VImg,
    },
    setup(_, { attrs }) {
      const windowId = (attrs['window-state'] as WindowState).id;
      const app = inject('app') as VcsUiApp;
      const activeMapClassName = app.maps.activeMap?.className;
      const manager = inject('manager') as MeasurementManager;
      const { values } = manager.currentMeasurementMode.value!;
      const targetFeature: ShallowRef<Feature | undefined> = shallowRef();
      const isPersistent = shallowRef(false);
      const isInCreation = shallowRef(false);
      const isEditable = shallowRef(false);
      const isMapSupported = shallowRef(false);

      const editActions: Ref<VcsAction[]> = ref([
        {
          name: 'editAction',
          icon: '$vcsEditVertices',
          title: 'measurement.edit',
          active:
            manager.currentEditSession.value?.type ===
            SessionType.EDIT_GEOMETRY,
          disabled:
            !isMapSupported.value || isInCreation.value || !isEditable.value,
          callback(): void {
            if (this.active) {
              manager.stopEditing();
            } else {
              manager.startEditSession(targetFeature.value!);
            }
          },
        },
      ]);

      watch(
        () => manager.currentEditSession.value?.type,
        () => {
          editActions.value[0].active =
            manager.currentEditSession.value?.type ===
            SessionType.EDIT_GEOMETRY;
        },
      );

      watch([isMapSupported, isInCreation, isEditable], () => {
        editActions.value[0].disabled =
          !isMapSupported.value || isInCreation.value || !isEditable.value;
      });

      const headers = computed(() => {
        const usedHeaders = [
          { title: '', value: 'name' },
          { title: 'X', value: 'x' },
          { title: 'Y', value: 'y' },
        ];

        const { type } = values.value;
        if (
          type === MeasurementType.Position3D ||
          type === MeasurementType.Area3D ||
          type === MeasurementType.Distance3D
        ) {
          usedHeaders.push({ title: 'Z', value: 'z' });
        }

        return usedHeaders;
      });

      const sketchIcon = computed(() => {
        const theme = app.vuetify.theme.current.value.dark ? 'dark' : 'light';
        return getPluginAssetUrl(
          app,
          name,
          `plugin-assets/sketch_${theme}.png`,
        );
      });

      watch(
        manager.currentFeatures,
        () => {
          if (manager.currentFeatures.value.length > 0) {
            targetFeature.value = manager.currentFeatures.value[0];
            isPersistent.value = !!manager.category?.collection.hasKey(
              targetFeature.value?.getId(),
            );
            isEditable.value = !targetFeature.value?.[doNotEditAndPersistent];
            isMapSupported.value = // prettier-ignore
              (
                targetFeature.value?.[measurementModeSymbol] as MeasurementMode
              )?.supportedMaps.includes(app.maps.activeMap!.className);
          }
        },
        { immediate: true },
      );

      watch(
        manager.currentSession,
        () => {
          isInCreation.value =
            manager.currentSession.value?.type === SessionType.CREATE;
        },
        { immediate: true },
      );

      watch(
        values,
        () => {
          const points = values.value.vertexPositions;
          if (points) {
            points.forEach((p) => {
              if (!p.name) {
                p.name = `${app.vueI18n.t('measurement.value.point')} ${p.id}`;
              }
            });
          }
        },
        { immediate: true },
      );

      onUnmounted(() => {
        if (!isPersistent.value) {
          (
            manager.currentSession.value as SelectFeaturesSession
          )?.clearSelection?.();
        }
      });

      return {
        MeasurementType,
        activeMapClassName,
        values,
        headers,
        targetFeature,
        isPersistent,
        isInCreation,
        isMapSupported,
        isEditable,
        editActions,
        sketchIcon,
        createNewMeasurement(): void {
          manager.startCreateSession(values.value.type);
          app.windowManager.remove(windowId);
        },
        addToCategory(): void {
          if (targetFeature.value) {
            manager.category!.addToCollection(targetFeature.value);
            manager.currentFeatures.value = [targetFeature.value];
            isPersistent.value = true;
          }
        },
        getCopyAction(value: string): VcsAction {
          return {
            name: 'copyAction',
            icon: 'mdi-content-copy',
            callback(): void {
              if (!navigator.clipboard) {
                const input = document.createElement('textarea');
                input.innerHTML = value;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
              } else {
                navigator.clipboard.writeText(value).catch(() => {});
              }
            },
          };
        },
        required: [
          (v: never): true | string => !!v || 'Input may not be null',
          (v: never[]): true | string =>
            v.length > 0 || 'Input must have a length',
        ],
      };
    },
  });
</script>

<style lang="scss" scoped>
  .d-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
</style>
