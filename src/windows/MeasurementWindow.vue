<template>
  <VcsWorkspaceWrapper
    :disable-add="isPersistent || isInCreation || !isEditable"
    :disable-new="!isMapSupported"
    @new-clicked="createNewMeasurement"
    @add-clicked="addToCategory"
  >
    <template v-if="!targetFeature">
      <v-card class="pa-2" elevation="0">
        {{ $t('measurement.create.noFeature') }}
      </v-card>
    </template>
    <VcsFormSection
      v-if="targetFeature && values"
      :heading="`measurement.create.${values.type}`"
      :header-actions="[editAction]"
    >
      <!--point measurement block-->
      <VcsDataTable
        v-if="
          values.type === MeasurementType.Position3D ||
          values.type === MeasurementType.Position2D
        "
        :items="values.vertexPositions"
        item-key="id"
        :headers="headers"
        :show-searchbar="false"
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
          v-if="values.type === MeasurementType.Distance2D"
          no-gutters
          class="py-2 px-2"
        >
          {{ $t('measurement.hint.oblique.distance') }}
        </v-row>
        <v-row
          v-if="values.type === MeasurementType.ObliqueHeight2D"
          no-gutters
          class="py-2 px-2"
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
        <VcsFormSection v-if="sketchIcon" :expandable="true" heading="Sketch">
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
      v-if="
        targetFeature &&
        (values?.type === MeasurementType.Distance2D ||
          values?.type === MeasurementType.Distance3D)
      "
      :heading="`measurement.value.points`"
    >
      <VcsDataTable
        :items="values.vertexPositions"
        item-key="id"
        :headers="headers"
        :show-searchbar="false"
      >
      </VcsDataTable>
    </VcsFormSection>
  </VcsWorkspaceWrapper>
</template>

<script lang="ts">
  import type { VcsUiApp, VcsAction, WindowState } from '@vcmap/ui';
  import { getLogger } from '@vcsuite/logger';
  import {
    VcsDataTable,
    VcsFormSection,
    VcsLabel,
    VcsActionButtonList,
    VcsWorkspaceWrapper,
    getPluginAssetUrl,
    NotificationType,
  } from '@vcmap/ui';
  import { VRow, VCol, VImg, VCard } from 'vuetify/components';
  import {
    inject,
    reactive,
    watch,
    computed,
    onUnmounted,
    defineComponent,
    ref,
    nextTick,
  } from 'vue';
  import { unByKey } from 'ol/Observable.js';
  import { measurementTypeIcon } from '../util/toolbox.js';
  import {
    doNotEditAndPersistent,
    measurementModeSymbol,
    MeasurementType,
  } from '../mode/measurementMode.js';
  import { name } from '../../package.json';

  import { isCreateSession, isEditGeometrySession } from '../util/actionHelper';
  import type { MeasurementPlugin } from '../index.js';

  export default defineComponent({
    name: 'MeasurementWindow',
    components: {
      VcsDataTable,
      VcsFormSection,
      VcsLabel,
      VcsActionButtonList,
      VcsWorkspaceWrapper,
      VRow,
      VCol,
      VImg,
      VCard,
    },
    setup(_props, { attrs }) {
      const app = inject('vcsApp') as VcsUiApp;
      const { manager } = app.plugins.getByKey(name) as MeasurementPlugin;
      const windowState = attrs['window-state'] as WindowState;
      const activeMapClassName = app.maps.activeMap?.className;
      const values = computed(() => {
        return manager.currentMeasurementMode.value?.values?.value ?? undefined;
      });
      const isInCreation = ref(false);
      const isEditable = ref(false);
      const isMapSupported = ref(false);
      const isPersistent = ref(false);

      const editAction = reactive<VcsAction>({
        name: 'editAction',
        icon: '$vcsEditVertices',
        title: 'measurement.edit',
        active: false,
        disabled:
          !isMapSupported.value || isInCreation.value || !isEditable.value,
        callback(): void {
          if (editAction.active) {
            manager.stop();
          } else if (manager.currentFeature.value) {
            manager.startEditSession(manager.currentFeature.value);
          }
        },
      });

      let creationFinished = (): void => {};
      watch(
        manager.currentSession,
        () => {
          const session = manager.currentSession.value;
          editAction.active = isEditGeometrySession(session);
          const creationSession = isCreateSession(session);
          isInCreation.value = creationSession;
          const currentType = values.value?.type;
          if (creationSession) {
            creationFinished = session.creationFinished.addEventListener(
              (feature) => {
                if (
                  !feature &&
                  currentType &&
                  currentType === values.value?.type
                ) {
                  app.notifier.add({
                    type: NotificationType.WARNING,
                    message: app.vueI18n.t('measurement.create.failed'),
                  });
                  manager
                    .startCreateSession(values.value.type)
                    .catch((err: unknown) => {
                      getLogger(name).error(
                        'Error starting create session',
                        err,
                      );
                    });
                }
              },
            );
          }
        },
        { immediate: true },
      );

      watch(
        [isMapSupported, isInCreation, isEditable],
        () => {
          editAction.disabled =
            !isMapSupported.value || isInCreation.value || !isEditable.value;
        },
        { immediate: true },
      );

      const headers = computed(() => {
        const usedHeaders = [
          { title: '', value: 'name' },
          { title: 'X', value: 'x' },
          { title: 'Y', value: 'y' },
        ];

        const type = values.value?.type;
        if (
          type === MeasurementType.Position3D ||
          type === MeasurementType.Area3D ||
          type === MeasurementType.Distance3D
        ) {
          usedHeaders.push({ title: 'Z', value: 'z' });
        }

        return usedHeaders;
      });

      let renameListener = (): void => {};
      const featureTitle = ref('');
      function setFeatureTitle(): void {
        renameListener();
        const feature = manager.currentFeature.value;
        if (feature) {
          const propertyChangeListener = feature.on(
            'propertychange',
            ({ key }) => {
              if (key === 'title') {
                featureTitle.value = feature.get('title');
              }
            },
          );
          renameListener = (): void => {
            unByKey(propertyChangeListener);
          };
          featureTitle.value = feature.get('title');
        }
      }

      watch([featureTitle, isPersistent], () => {
        windowState.headerTitle =
          isPersistent.value && featureTitle.value
            ? featureTitle.value
            : 'measurement.header.title';
      });

      watch(
        manager.currentFeature,
        (feature) => {
          setFeatureTitle();
          isPersistent.value = !!feature && manager.collection.has(feature);
          isEditable.value = !!feature && !feature[doNotEditAndPersistent];
          isMapSupported.value =
            !!feature &&
            feature[measurementModeSymbol].supportedMaps.includes(
              app.maps.activeMap!.className,
            );
        },
        { immediate: true },
      );

      const sketchIcon = computed(() => {
        const theme = app.vuetify.theme.current.value.dark ? 'dark' : 'light';
        return getPluginAssetUrl(
          app,
          name,
          `plugin-assets/sketch_${theme}.png`,
        );
      });

      watch(
        values,
        () => {
          const points = values.value?.vertexPositions;
          if (points) {
            points.forEach((p) => {
              if (!p.name) {
                p.name = `${app.vueI18n.t('measurement.value.point')} ${p.id}`;
              }
            });
          }
          if (values.value) {
            windowState.headerIcon = measurementTypeIcon[values.value.type];
          }
        },
        { immediate: true },
      );

      onUnmounted(() => {
        creationFinished();
        renameListener();
        nextTick(() => {
          if (!app.windowManager.has(windowState.id)) {
            manager.stop();
            manager.currentFeature.value = undefined;
          }
        }).catch((err: unknown) => {
          getLogger(name).error('Error on window close ', err);
        });
      });

      return {
        MeasurementType,
        activeMapClassName,
        values,
        headers,
        targetFeature: manager.currentFeature,
        isPersistent,
        isInCreation,
        isMapSupported,
        isEditable,
        editAction,
        sketchIcon,
        createNewMeasurement(): void {
          manager
            .startCreateSession(values.value!.type)
            .catch((err: unknown) => {
              getLogger(name).error('Error starting create session', err);
            });
        },
        addToCategory(): void {
          manager.persistCurrentFeature();
          isPersistent.value = true;
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
                // eslint-disable-next-line @typescript-eslint/no-deprecated
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
