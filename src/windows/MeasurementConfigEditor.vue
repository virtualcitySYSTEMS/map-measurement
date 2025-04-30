<template>
  <AbstractConfigEditor v-bind="{ ...$attrs, ...$props }" @submit="apply">
    <v-container class="pa-0">
      <VcsFormSection
        v-for="(mapName, index) in Object.values(MapNames)"
        :key="index"
        :heading="mapName.replace('Map', ' Map')"
        start-open
        :header-actions="[
          {
            name: 'toggle',
            title: `measurement.config.${localConfig[mapName].disable ? 'enable' : 'disable'}`,
            icon: `$vcsCheckbox${localConfig[mapName].disable ? '' : 'Checked'}`,
            callback: () => {
              localConfig[mapName].disable = !localConfig[mapName].disable;
            },
          },
        ]"
      >
        <div v-if="!localConfig[mapName].disable">
          <v-row no-gutters>
            <v-col>
              <VcsLabel :html-for="`${mapName}_decimalPlaces`" required>
                {{ $t('measurement.config.decimalPlaces') }}
              </VcsLabel>
            </v-col>
            <v-col>
              <VcsTextField
                :id="`${mapName}_decimalPlaces`"
                v-model.number="localConfig[mapName].decimalPlaces"
                type="number"
                min="0"
                :rules="[
                  (v: number) =>
                    ((!!v || v === 0) && v >= 0) ||
                    'measurement.config.errorInput',
                ]"
              />
            </v-col>
          </v-row>
          <v-row v-if="mapName !== MapNames.OpenLayers" no-gutters>
            <v-col>
              <VcsLabel :html-for="`${mapName}_decimalPlacesZ`">
                {{ $t('measurement.config.decimalPlacesZ') }}
              </VcsLabel>
            </v-col>
            <v-col>
              <VcsTextField
                :id="`${mapName}_decimalPlacesZ`"
                v-model.number="localConfig[mapName].decimalPlacesZ"
                :placeholder="String(localConfig[mapName].decimalPlaces)"
                min="0"
                :rules="[
                  (v: number) => v >= 0 || 'measurement.config.errorInput',
                ]"
              />
            </v-col>
          </v-row>
          <v-row v-if="mapName === MapNames.Cesium" no-gutters>
            <v-col>
              <VcsLabel :html-for="`${mapName}_decimalPlacesAngle`" required>
                {{ $t('measurement.config.decimalPlacesAngle') }}
              </VcsLabel>
            </v-col>
            <v-col>
              <VcsTextField
                :id="`${mapName}_decimalPlacesAngle`"
                v-model.number="localConfig[mapName].decimalPlacesAngle"
                type="number"
                min="0"
                :rules="[
                  (v: number) =>
                    ((!!v || v === 0) && v >= 0) ||
                    'measurement.config.errorInput',
                ]"
              />
            </v-col>
          </v-row>
        </div>
      </VcsFormSection>
    </v-container>
  </AbstractConfigEditor>
</template>

<script lang="ts">
  import type { PropType } from 'vue';
  import { defineComponent, ref, toRaw } from 'vue';
  import { VCol, VContainer, VRow } from 'vuetify/components';
  import {
    AbstractConfigEditor,
    VcsFormSection,
    VcsLabel,
    VcsTextField,
  } from '@vcmap/ui';
  import { MapNames, parseOptions } from '../util/configHelper.js';
  import type { MeasurementConfig } from '../util/configHelper.js';

  export default defineComponent({
    name: 'MeasurementConfigEditor',
    components: {
      AbstractConfigEditor,
      VCol,
      VContainer,
      VRow,
      VcsFormSection,
      VcsLabel,
      VcsTextField,
    },
    props: {
      getConfig: {
        type: Function as PropType<() => MeasurementConfig>,
        required: true,
      },
      setConfig: {
        type: Function as PropType<(config: object | undefined) => void>,
        required: true,
      },
    },
    setup(props) {
      const config = props.getConfig();
      const localConfig = ref({ ...config, ...parseOptions(config) });

      function apply(): void {
        if (
          localConfig.value[MapNames.Oblique].disable ||
          !!localConfig.value[MapNames.Oblique].decimalPlacesZ
        ) {
          delete localConfig.value[MapNames.Oblique]?.decimalPlacesZ;
        }
        if (
          localConfig.value[MapNames.Cesium].disable ||
          !!localConfig.value[MapNames.Cesium].decimalPlacesZ
        ) {
          delete localConfig.value[MapNames.Cesium]?.decimalPlacesZ;
        }
        props.setConfig(structuredClone(toRaw(localConfig.value)));
      }
      return {
        localConfig,
        apply,
        MapNames,
      };
    },
  });
</script>
