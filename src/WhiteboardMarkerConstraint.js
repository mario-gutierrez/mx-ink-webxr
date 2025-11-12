/**
 * WhiteboardMarkerConstraint class
 * Handles collision detection and position correction for a marker interacting with a whiteboard
 */
import * as THREE from "three";
class WhiteboardMarkerConstraint {
    /**
     * @param {Object} config - Configuration object
     * @param {THREE.Vector3} config.whiteboardSize - Size of whiteboard (width, height, depth)
     * @param {THREE.Vector3} config.whiteboardPosition - Position of whiteboard center
     * @param {THREE.Quaternion} config.whiteboardRotation - Rotation of whiteboard
     * @param {number} config.markerLength - Length of the marker
     */
    constructor(config) {
        this.whiteboardSize = config.whiteboardSize || new THREE.Vector3(2, 1, 0);
        this.whiteboardPosition = config.whiteboardPosition || new THREE.Vector3(0, 0, 0);
        this.whiteboardRotation = config.whiteboardRotation || new THREE.Quaternion();
        this.markerLength = config.markerLength || 0.12;

        // State for locked position
        this.isLocked = false;
        this.lockedTipPosition = new THREE.Vector3();

        // Compute whiteboard plane in world space
        this._updateWhiteboardPlane();
    }

    /**
     * Updates the whiteboard plane normal and point
     * @private
     */
    _updateWhiteboardPlane() {
        // Whiteboard normal in local space is (0, 0, 1)
        this.planeNormal = new THREE.Vector3(0, 0, 1);
        this.planeNormal.applyQuaternion(this.whiteboardRotation);
        this.planeNormal.normalize();

        // Plane point is the whiteboard center
        this.planePoint = this.whiteboardPosition.clone();
    }

    /**
     * Projects a point onto the whiteboard plane
     * @param {THREE.Vector3} point - Point to project
     * @returns {THREE.Vector3} Projected point
     * @private
     */
    _projectPointOnPlane(point) {
        const pointToPlane = new THREE.Vector3().subVectors(point, this.planePoint);
        const distance = pointToPlane.dot(this.planeNormal);
        return point.clone().sub(this.planeNormal.clone().multiplyScalar(distance));
    }

    /**
     * Calculates the signed distance from a point to the whiteboard plane
     * @param {THREE.Vector3} point - Point to test
     * @returns {number} Signed distance (negative means behind the plane)
     * @private
     */
    _distanceToPlane(point) {
        const pointToPlane = new THREE.Vector3().subVectors(point, this.planePoint);
        return pointToPlane.dot(this.planeNormal);
    }

    /**
     * Gets the visible marker pose given a desired tip pose
     * @param {Object} desiredPose - Desired pose of the marker tip
     * @param {THREE.Vector3} desiredPose.position - Desired tip position
     * @param {THREE.Quaternion} desiredPose.rotation - Desired marker orientation
     * @returns {Object} Visual pose to apply { position: Vector3, rotation: Quaternion, isColliding: bool }
     */
    getVisibleMarkerPose(desiredPose) {
        const tipPosition = desiredPose.position.clone();
        const markerRotation = desiredPose.rotation.clone();

        // Calculate marker direction (from tip backwards along marker axis)
        // Marker points along negative Y in local space
        const markerDirection = new THREE.Vector3(0, -1, 0);
        markerDirection.applyQuaternion(markerRotation);
        markerDirection.normalize();

        // Check if tip would penetrate the whiteboard
        const distanceToPlane = this._distanceToPlane(tipPosition);
        const wouldCollide = distanceToPlane < 0;

        let resultPosition;
        let isColliding = false;

        if (wouldCollide) {
            if (!this.isLocked) {
                // First collision - lock tip to plane
                this.lockedTipPosition = this._projectPointOnPlane(tipPosition);
                this.isLocked = true;
            }

            // Project current desired tip onto plane
            const projectedTip = this._projectPointOnPlane(tipPosition);

            // Calculate XY movement on the plane (distance along plane surface)
            const movement = new THREE.Vector3().subVectors(
                projectedTip,
                this.lockedTipPosition
            );

            // Only update if there's significant movement along the plane
            if (movement.length() > 0.001) {
                this.lockedTipPosition.copy(projectedTip);
            }

            // Calculate marker center position from locked tip
            // Center is markerLength/2 away from tip along marker direction
            resultPosition = this.lockedTipPosition.clone().add(
                markerDirection.clone().multiplyScalar(-this.markerLength / 2)
            );

            isColliding = true;
        } else {
            // No collision - unlock
            this.isLocked = false;

            // Calculate marker center from desired tip position
            resultPosition = tipPosition.clone().add(
                markerDirection.clone().multiplyScalar(-this.markerLength / 2)
            );
        }

        return {
            position: resultPosition,
            rotation: markerRotation,
            isColliding: isColliding,
            tipPosition: this.isLocked ? this.lockedTipPosition.clone() : tipPosition.clone()
        };
    }

    /**
     * Updates whiteboard configuration
     * @param {Object} config - New configuration
     */
    updateWhiteboard(config) {
        if (config.whiteboardSize) this.whiteboardSize = config.whiteboardSize;
        if (config.whiteboardPosition) this.whiteboardPosition = config.whiteboardPosition;
        if (config.whiteboardRotation) this.whiteboardRotation = config.whiteboardRotation;
        this._updateWhiteboardPlane();
        this.isLocked = false; // Reset lock state when whiteboard changes
    }

    /**
     * Resets the constraint state
     */
    reset() {
        this.isLocked = false;
        this.lockedTipPosition.set(0, 0, 0);
    }
}

export { WhiteboardMarkerConstraint };
