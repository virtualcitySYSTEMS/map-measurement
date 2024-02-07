<template>
  <v-sheet>
    <VcsFormSection
      :heading="`measurement.create.${values.type}`"
      :header-actions="editActions"
    >
      <!--point measurement block-->
      <vcs-data-table
        :items="values.vertexPositions"
        item-key="id"
        :headers="headers"
        :show-searchbar="false"
        v-if="values.type === MeasurementType.Position3D"
      >
      </vcs-data-table>
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
              :actions="[getCopyAction(values.distance)]"
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
              :actions="[getCopyAction(values.area)]"
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
              :actions="[getCopyAction(values.circumference)]"
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
              :actions="[getCopyAction(values.height)]"
            />
          </v-col>
        </v-row>
      </div>
      <!--oblique measurement hint-->
      <div v-if="values.type === MeasurementType.ObliqueHeight2D">
        <v-row no-gutters class="py-2 px-2">
          {{ $t('measurement.hint.oblique') }}
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
              :actions="[getCopyAction(values.height)]"
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
              :actions="[getCopyAction(values.horizontal)]"
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
              :actions="[getCopyAction(values.distance)]"
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
              :actions="[getCopyAction(values.alpha)]"
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
              :actions="[getCopyAction(values.beta)]"
            />
          </v-col>
        </v-row>
        <VcsFormSection :expandable="true" heading="Sketch">
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
              :actions="[getCopyAction(values.heightAltitude)]"
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
              :actions="[getCopyAction(values.groundAltitude)]"
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
      <vcs-data-table
        :items="values.vertexPositions"
        item-key="id"
        :headers="headers"
        :show-searchbar="false"
      >
      </vcs-data-table>
    </VcsFormSection>
    <div class="d-flex w-full justify-space-between px-2 pt-2 pb-1">
      <VcsFormButton
        @click="addToCategory"
        icon="$vcsComponentsPlus"
        :disabled="isPersistent"
        :tooltip="$t('measurement.create.tooltip.addToWorkspace')"
      />
      <VcsFormButton @click="createNewMeasurement" variant="filled">
        {{ $t('measurement.create.new') }}
      </VcsFormButton>
    </div>
  </v-sheet>
</template>
<script>
  import {
    VcsDataTable,
    VcsFormSection,
    VcsLabel,
    VcsActionButtonList,
    VcsFormButton,
    getPluginAssetUrl,
  } from '@vcmap/ui';
  import { VRow, VCol, VSheet, VImg } from 'vuetify/lib';
  import {
    inject,
    ref,
    watch,
    getCurrentInstance,
    computed,
    onUnmounted,
    shallowRef,
  } from 'vue';
  import { SessionType } from '@vcmap/core';
  import { MeasurementType } from '../util/toolbox.js';
  import { measurementModeSymbol } from '../mode/measurementMode.js';
  import { name } from '../../package.json';

  export default {
    name: 'MeasurementWindow',
    computed: {
      MeasurementType() {
        return MeasurementType;
      },
    },
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
    setup(props, { attrs }) {
      const windowId = attrs['window-state'].id;
      const app = inject('app');
      /** @type {import("../measurementManager.js").MeasurementManager} */
      const manager = inject('manager');
      const values = ref(null);
      const targetFeature = shallowRef(null);
      const isPersistent = shallowRef(false);
      const vm = getCurrentInstance().proxy;
      const editActions = ref([
        {
          name: 'editAction',
          icon: '$vcsEditVertices',
          title: 'measurement.edit',
          active: computed(
            () =>
              manager.currentEditSession.value?.type ===
              SessionType.EDIT_GEOMETRY,
          ),
          callback() {
            if (this.active) {
              manager.stopEditing();
            } else {
              manager.startEditSession(targetFeature.value);
            }
          },
        },
      ]);

      const headers = [
        {
          text: '',
          value: 'name',
        },
        {
          text: 'X',
          value: 'x',
        },
        {
          text: 'Y',
          value: 'y',
        },
        {
          text: 'Z',
          value: 'z',
        },
      ];

      watch(
        manager.currentFeatures,
        () => {
          if (manager.currentFeatures.value.length > 0) {
            targetFeature.value = manager.currentFeatures.value[0];
            isPersistent.value = manager.category.value.collection.hasKey(
              targetFeature.value?.getId(),
            );
            if (
              targetFeature.value?.[measurementModeSymbol]?.type ===
              MeasurementType.ObliqueHeight2D
            ) {
              editActions.value = [];
            }
          }
        },
        { immediate: true },
      );

      watch(
        manager.currentValues,
        () => {
          values.value = manager.currentValues.value;
        },
        { immediate: true },
      );

      watch(
        values.value,
        () => {
          const points = values.value.vertexPositions;
          if (points) {
            points.forEach((p) => {
              if (!p.name) {
                p.name = computed(() => {
                  return `${vm.$t('measurement.value.point')} ${p.id}`;
                });
              }
            });
          }
        },
        { immediate: true },
      );

      onUnmounted(() => {
        if (!isPersistent.value) {
          manager.currentSession.value?.clearSelection?.();
        }
      });

      return {
        values,
        headers,
        targetFeature,
        isPersistent,
        editActions,
        sketchIcon: getPluginAssetUrl(app, name, 'plugin-assets/sketch.png'),
        createNewMeasurement() {
          manager.startCreateSession(values.value.type);
          app.windowManager.remove(windowId);
        },
        addToCategory() {
          if (targetFeature.value) {
            manager.category.value.addToCollection(targetFeature.value);
            manager.currentFeatures.value = [targetFeature.value];
            isPersistent.value = true;
          }
        },
        getCopyAction(value) {
          return {
            name: 'copyAction',
            icon: 'mdi-content-copy',
            callback() {
              navigator.clipboard.writeText(value);
            },
          };
        },
        required: [
          (v) => !!v || 'Input may not be null',
          (v) => v.length > 0 || 'Input must have a length',
        ],
      };
    },
  };
</script>

<style lang="scss" scoped>
  .d-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
</style>
