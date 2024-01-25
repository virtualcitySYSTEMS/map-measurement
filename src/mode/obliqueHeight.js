import {
  cartesian3DDistance as distance3D,
  mercatorProjection,
  checkLineIntersection,
  GeometryType,
  transformFromImage,
  transformToImage,
  defaultVectorStyle,
} from '@vcmap/core';
import { Cartesian3, Matrix3 } from '@vcmap-cesium/engine';
import { transform } from 'ol/proj';
import { LineString, Point } from 'ol/geom';
import { Style } from 'ol/style.js';
import { MeasurementType } from '../util/toolbox.js';
import MeasurementMode from './measurementMode.js';

class ObliqueHeight extends MeasurementMode {
  constructor(options) {
    super(options);
    this.set = false;
    this.selfCall = false;
    this.measureVecGround = new Cartesian3();
    this.measureVecOrientation = new Cartesian3();
  }

  // eslint-disable-next-line class-methods-use-this
  get type() {
    return MeasurementType.ObliqueHeight2D;
  }

  // eslint-disable-next-line class-methods-use-this
  get geometryType() {
    return GeometryType.LineString;
  }

  calcMeasurementResult(feature) {
    if (this.selfCall) {
      this.selfCall = false;
      return Promise.resolve(false);
    }

    const coords = feature.getGeometry().getCoordinates();

    if (coords.length === 1) {
      this.values = this.defaultValues;
      return Promise.resolve(false);
    }

    const map = this.app.maps.activeMap;
    const { currentImage } = map;

    return new Promise((resolve) => {
      if (!this.set && coords.length === 2) {
        this.startUndistorted = currentImage.meta.radialDistortionCoordinate(
          coords[0],
          true,
        );
        this.startDistorted = coords[0].slice();
        this.measureVecGround = Cartesian3.fromElements(
          this.startUndistorted[0],
          this.startUndistorted[1],
          0,
          this.measureVecGround,
        );
        transformFromImage(currentImage, coords[0])
          .then((res) => {
            this.startPointRealWorld = res.coords;
            const lifted = res.coords.slice();
            lifted[2] += 10;
            return transformToImage(currentImage, lifted);
          })
          .then((res) => {
            this.liftedUndistorted =
              currentImage.meta.radialDistortionCoordinate(res.coords, true);
            const liftedCoord = Cartesian3.fromElements(
              this.liftedUndistorted[0],
              this.liftedUndistorted[1],
              0,
            );
            //     this.onHold = false;
            this.set = true;
            this.measureVecOrientation = Cartesian3.subtract(
              liftedCoord,
              this.measureVecGround,
              this.measureVecOrientation,
            );
            this.measureVecOrientation = Cartesian3.normalize(
              this.measureVecOrientation,
              this.measureVecOrientation,
            );
            this.selfCall = true;
            feature
              .getGeometry()
              .setCoordinates([this.startDistorted, this.startDistorted]);
            resolve(true);
          });
      } else if (this.set) {
        if (coords.length === 3) {
          this.manager.currentSession.value.finish();
          this.set = false;
          this.selfCall = false;
          resolve(true);
        }
        const mouseImageCoordinateUndistorted =
          currentImage.meta.radialDistortionCoordinate(coords[1], true);

        const perpendicularLine = [
          [
            mouseImageCoordinateUndistorted[0],
            mouseImageCoordinateUndistorted[1],
          ],
          [
            mouseImageCoordinateUndistorted[0] + 1,
            mouseImageCoordinateUndistorted[1],
          ],
        ];

        const intersectionMouse2GroundHeight = checkLineIntersection(
          // XXX find replacement
          perpendicularLine,
          [this.startUndistorted, this.liftedUndistorted],
        );

        const measurementCurrentPoint = [
          intersectionMouse2GroundHeight.x,
          intersectionMouse2GroundHeight.y,
        ];
        const measurementCurrentPointCorrected =
          currentImage.meta.radialDistortionCoordinate(
            measurementCurrentPoint,
            false,
          );
        measurementCurrentPointCorrected.push(0);

        const measureVecMouse = new Cartesian3(
          measurementCurrentPoint[0],
          measurementCurrentPoint[1],
          0,
        );
        let measureVecCurrOrientation = Cartesian3.subtract(
          measureVecMouse,
          this.measureVecGround,
          new Cartesian3(),
        );
        measureVecCurrOrientation = Cartesian3.normalize(
          measureVecCurrOrientation,
          measureVecCurrOrientation,
        );
        const dot = Cartesian3.dot(
          this.measureVecOrientation,
          measureVecCurrOrientation,
        );
        this.selfCall = true;

        let finalCoords;
        if (dot < 0 || Number.isNaN(dot)) {
          this.values.height = this.getValue(0);
          finalCoords = [this.startDistorted, this.startDistorted];
        } else {
          const heightPos = this.findVertical3DPositionRegardingPixel(
            map,
            measurementCurrentPoint,
            this.startPointRealWorld,
          );
          this.values.height = this.getValue(
            distance3D(this.startPointRealWorld, heightPos),
          );
          finalCoords = [this.startDistorted, measurementCurrentPointCorrected];
        }

        feature.getGeometry().setCoordinates(finalCoords);
        resolve(true);
      }
    });
  }

  createTemplateFeature() {
    const templateFeature = super.createTemplateFeature();
    templateFeature.setGeometry(new LineString([]));

    const text = MeasurementMode.getDefaultText();
    const labelStyle = new Style({
      text,
      geometry: (f) => {
        const coords = f.getGeometry().getCoordinates();
        if (coords.length === 2) {
          return new Point(coords[1]);
        }
        return f.getGeometry();
      },
    });

    const obliqueHeightStyleFunction = () => {
      text.setText(this.values.height);
      return [defaultVectorStyle.style, labelStyle];
    };
    templateFeature.setStyle(obliqueHeightStyleFunction);

    return templateFeature;
  }

  // eslint-disable-next-line class-methods-use-this
  findVertical3DPositionRegardingPixel(map, pixelCoordinate, pointOnGround) {
    const { currentImage } = map;

    // calculate camera coordinates
    let imageCoordinates = new Cartesian3(
      pixelCoordinate[0],
      currentImage.meta.size[1] - pixelCoordinate[1],
      1,
    );
    imageCoordinates = Matrix3.multiplyByVector(
      currentImage.pToRealworld,
      imageCoordinates,
      imageCoordinates,
    );

    // ray in vertical direction from ground pointing upwards
    let rayVerticalVec3 = new Cartesian3(0, 0, 1);

    // intersect the two rays
    let d = Cartesian3.cross(
      rayVerticalVec3,
      imageCoordinates,
      new Cartesian3(),
    );
    const worldCoord = transform(
      pointOnGround,
      mercatorProjection.proj,
      currentImage.meta.projection.proj,
    );
    let pointGroundVec = Cartesian3.fromArray(worldCoord);
    const b = Cartesian3.subtract(
      currentImage.projectionCenter,
      pointGroundVec,
      new Cartesian3(),
    );

    let A = Matrix3.fromRowMajorArray([
      rayVerticalVec3.x,
      imageCoordinates.x,
      d.x,
      rayVerticalVec3.y,
      imageCoordinates.y,
      d.y,
      rayVerticalVec3.z,
      imageCoordinates.z,
      d.z,
    ]);
    A = Matrix3.inverse(A, A);
    const lambda = Matrix3.multiplyByVector(A, b, new Cartesian3());

    d = Cartesian3.multiplyByScalar(d, lambda.z, d);
    rayVerticalVec3 = Cartesian3.multiplyByScalar(
      rayVerticalVec3,
      lambda.x,
      rayVerticalVec3,
    );

    rayVerticalVec3 = Cartesian3.add(rayVerticalVec3, d, rayVerticalVec3);
    pointGroundVec = Cartesian3.add(
      pointGroundVec,
      rayVerticalVec3,
      pointGroundVec,
    );

    const heightCoords = [pointGroundVec.x, pointGroundVec.y, pointGroundVec.z];
    return transform(
      heightCoords,
      currentImage.meta.projection.proj,
      mercatorProjection.proj,
    );
  }
}

export default ObliqueHeight;
