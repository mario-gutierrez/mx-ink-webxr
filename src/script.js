import * as THREE from "three";
import { TubePainter } from "three/examples/jsm/misc/TubePainter.js";
import { XRButton } from "three/examples/jsm/webxr/XRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let stylus;
let painter1;
let gamepad1;
let isDrawingOutsideWhiteboard = false;
let prevIsDrawing = false;

// Whiteboard drawing
let whiteboard;
let whiteboardCanvas, whiteboardCtx, canvasTexture;
let drawColor = '#ff0000';
let drawWidth = 5;
let lastPoint = null;
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 512;
const DRAW_THRESHOLD = 0.01; // How close stylus needs to be to draw

function clearWhiteboard() {
  whiteboardCtx.fillStyle = 'white';
  whiteboardCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (canvasTexture) canvasTexture.needsUpdate = true;
}

function drawOnCanvas(from, to) {
  whiteboardCtx.beginPath();
  whiteboardCtx.moveTo(from.x, from.y);
  whiteboardCtx.lineTo(to.x, to.y);
  whiteboardCtx.strokeStyle = drawColor;
  whiteboardCtx.lineWidth = drawWidth;
  whiteboardCtx.lineCap = 'round';
  whiteboardCtx.lineJoin = 'round';
  whiteboardCtx.stroke();
  // Tell three.js to update the texture
  if (canvasTexture) canvasTexture.needsUpdate = true;
  console.log(`${JSON.stringify(from)} - ${JSON.stringify(to)}`);
}
// This function converts a 3D world position to 2D canvas coordinates
function getDrawingCoordinates(worldPosition) {
  // Check distance to whiteboard plane
  const whiteboardPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    new THREE.Vector3(0, 0, 1).applyQuaternion(whiteboard.quaternion),
    whiteboard.position
  );
  const distance = whiteboardPlane.distanceToPoint(worldPosition);

  if (Math.abs(distance) > DRAW_THRESHOLD) {
    return null;
  }

  // Project point onto the whiteboard plane
  const projectedPoint = new THREE.Vector3();
  whiteboardPlane.projectPoint(worldPosition, projectedPoint);

  // Convert world coordinates to the whiteboard's local coordinates
  const localPoint = whiteboard.worldToLocal(projectedPoint.clone());

  // Convert local coordinates (-width/2 to +width/2) to UV coordinates (0 to 1)
  const uv = new THREE.Vector2(
    (localPoint.x / whiteboard.geometry.parameters.width) + 0.5,
    (localPoint.y / whiteboard.geometry.parameters.height) + 0.5
  );

  if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
    return null; // Point is outside the whiteboard
  }

  // Convert UV coordinates to canvas coordinates
  return {
    x: uv.x * CANVAS_WIDTH,
    y: (1 - uv.y) * CANVAS_HEIGHT // Y is inverted in canvas
  };
}

const material = new THREE.MeshNormalMaterial({
  flatShading: true,
  side: THREE.DoubleSide,
});

const cursor = new THREE.Vector3();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

init();

function init() {
  const canvas = document.querySelector("canvas.webgl");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 50);
  camera.position.set(0, 1.6, 3);

  const grid = new THREE.GridHelper(4, 1, 0x111111, 0x111111);
  scene.add(grid);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 2));

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(0, 2, 2);
  scene.add(light);

  painter1 = new TubePainter();
  painter1.mesh.material = material;
  painter1.setSize(0.1);

  scene.add(painter1.mesh);

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(window.devicePixelRatio, 2);
  renderer.setSize(sizes.width, sizes.height);
  renderer.setAnimationLoop(animate);
  renderer.xr.enabled = true;
  document.body.appendChild(XRButton.createButton(renderer, { optionalFeatures: ["unbounded"] }));

  const controllerModelFactory = new XRControllerModelFactory();

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("connected", onControllerConnected);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("connected", onControllerConnected);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);
  scene.add(controller2);


  // --- Whiteboard Canvas ---
  whiteboardCanvas = document.createElement('canvas');
  whiteboardCanvas.width = CANVAS_WIDTH;
  whiteboardCanvas.height = CANVAS_HEIGHT;
  whiteboardCtx = whiteboardCanvas.getContext('2d');

  // Initial clear
  clearWhiteboard();

  canvasTexture = new THREE.CanvasTexture(whiteboardCanvas);

  // --- Whiteboard 3D Object ---
  const whiteboardGeometry = new THREE.PlaneGeometry(2, 1);
  const whiteboardMaterial = new THREE.MeshStandardMaterial({
    map: canvasTexture,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.1
  });
  whiteboard = new THREE.Mesh(whiteboardGeometry, whiteboardMaterial);
  whiteboard.position.set(0, 1.0, -0.2); // Position in 3D space
  scene.add(whiteboard);
}

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

function animate() {
  if (gamepad1) {
    prevIsDrawing = isDrawingOutsideWhiteboard;
    isDrawingOutsideWhiteboard = gamepad1.buttons[5].value > 0 || gamepad1.buttons[4].value > 0;
    // debugGamepad(gamepad1);

    const currentPoint = getDrawingCoordinates(stylus.position);
    if (lastPoint && currentPoint) {
      drawOnCanvas(lastPoint, currentPoint);
      isDrawingOutsideWhiteboard = false; // do not draw in 3D
    }
    // Update lastPoint for the next move.
    // If currentPoint is null (stylus is too far), this will break the line.
    lastPoint = currentPoint;

    if (isDrawingOutsideWhiteboard && !prevIsDrawing) {
      const painter = stylus.userData.painter;
      painter.moveTo(stylus.position);
    }
  }

  handleDrawing(stylus);

  // Render
  renderer.render(scene, camera);
}

// MX Ink button indices:
// 5: tip (float)
// 0: front (bool)
// 4: middle (float)
// 1: rear (bool)

function handleDrawing(controller) {
  if (!controller) return;

  const userData = controller.userData;
  const painter = userData.painter;

  if (gamepad1) {
    cursor.set(stylus.position.x, stylus.position.y, stylus.position.z);

    if (isDrawingOutsideWhiteboard) {
      painter.lineTo(cursor);
      painter.update();
    }
  }
}

function onControllerConnected(e) {
  if (e.data.profiles.includes("logitech-mx-ink")) {
    stylus = e.target;
    stylus.userData.painter = painter1;
    gamepad1 = e.data.gamepad;
  }
}

function onSelectStart(e) {
  if (e.target !== stylus) return;
  const painter = stylus.userData.painter;
  painter.moveTo(stylus.position);
  this.userData.isSelecting = true;
}

function onSelectEnd() {
  this.userData.isSelecting = false;
}

function debugGamepad(gamepad) {
  gamepad.buttons.forEach((btn, index) => {
    if (btn.pressed) {
      console.log(`BTN ${index} - Pressed: ${btn.pressed} - Touched: ${btn.touched} - Value: ${btn.value}`);
    }

    if (btn.touched) {
      console.log(`BTN ${index} - Pressed: ${btn.pressed} - Touched: ${btn.touched} - Value: ${btn.value}`);
    }
  });
}
