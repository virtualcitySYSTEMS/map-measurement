# @vcmap/measurement

> Part of the [VC Map Project](https://github.com/virtualcitySYSTEMS/map-ui)

VC Map Plugin allowing measurements directly in the Map.

## Conduct Measurements

The measurement mode is active when the respective measurement option is activated, recognizable by the change of the mouse cursor from the selection arrow to the editing pen icon edit. Clicking on the map starts the measurement or continues a measurement that has already been started. Measurements can be completed by double-clicking at the endpoint. A new measurement is started using the NEW button.

### Edit Vertices

The Edit Mode can be acitvated through the following methods:

- Selecting the measurement geometry and clicking on **Edit measurement** in the tool window
- Right-Clicking on the measurement geometry and icon **Edit measurement** via the context menu
- Clicking on icon kebab next to the respective measurement in My Workspace, **Edit item** and icon **Edit measurement** in the tool window

The following actions are possible:

| Action                                                         | Description                                                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Addition of a new vertex                                       | A new vertex is created by clicking at the appropriate place on the geometry.                                                      |
| Movement of a vertex in all directions (horizontal / vertical) | The vertex is moved to the desired location by clicking and dragging with the left mouse button.                                   |
| Removal of a vertex                                            | The vertex is removed by clicking on it while holding “Shift”.+ (Important: the measurement must have been completed beforehand!). |

## Measurement Tool in the 2D Map

The following measurement tools are available in the 2D map:

- Point Measurement
- 2D Distance Measurement
- 2D Area Measurement

## Measurement Tool in the 3D Map

The measurement tool of the 3D map includes the measurement tools of the 2D map and extends them with explicit 3D measurement tools that allow to include 3D objects in the measurement, or direct measurement of these respectively.

The following measurement tools are available in the 3D map:

- 3D Point Measurement
- 2D Distance Measurement
- 2D Area Measurement
- 3D Distance Measurement
- 3D Area Measurement
- 3D Height Measurement

## Measurement Tool in the Oblique Map

The following measurement tools are available in the oblique map:

- 2D Point Measurement
- 2D Distance
- 2D Height Measurement

## Interaction with My Workspace

Each measurement added to My Workspace is listed there in the Measurements section. Using the icon overflow menu at the end of each entry, it is possible to:

- Edit the measurement.
- Rename the measurement.
- Zoom to the extent of the measurement.
- Remove the measurement from My Workspace.

## Configuration

For each map, two proporties can be set: whether to disable the measurement tools and the number of decimals to display.

The default configuration is shown below, and can be used as an example to set a different configuration:

```json
{
  "CesiumMap": {
    "disable": false,
    "decimalPlaces": 2
  },
  "ObliqueMap": {
    "disable": false,
    "decimalPlaces": 2
  },
  "OpenlayersMap": {
    "disable": false,
    "decimalPlaces": 2
  },
  "PanoramaMap": {
    "disable": true,
    "decimalPlaces": 2
  }
}
```

The number of decimal places for altimetry can also be set independently, as indicated above. When this value is not defined, the `decimalPlaces` value is used.
