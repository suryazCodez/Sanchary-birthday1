import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';
import { InteractiveObjectRef } from './ProceduralWorld';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public targetPosition: THREE.Vector3;

  // Camera Euler angles (YXZ order: rotationY = yaw, rotationX = pitch)
  public rotationY: number = 0;
  public targetRotationY: number = 0;
  public rotationX: number = 0;
  public targetRotationX: number = 0;

  public isWalking: boolean = false;
  public speed: number = 4.6;
  public stepDistance: number = 0;
  public isInsideHouse: boolean = false;

  // Key state
  public keys: { forward: boolean; backward: boolean; left: boolean; right: boolean } = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  // Virtual thumb joystick state (-1 to 1, where x = left/right, y = up/down on screen)
  public joystick: { x: number; y: number } = { x: 0, y: 0 };
  public buttonWalkForward: boolean = false;

  // Collision and path constraints
  private minX = -12;
  private maxX = 12;
  private minZ = -9.8;
  private maxZ = 24.5;

  public nearbyInteractive: InteractiveObjectRef | null = null;
  private _tempVec = new THREE.Vector3();
  private _lookMat = new THREE.Matrix4();
  private _lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.camera.rotation.order = 'YXZ';

    // Start along the scenic mountain trail looking towards the farmhouse
    this.position = new THREE.Vector3(0, 1.8, 22.0);
    this.targetPosition = this.position.clone();
    this.camera.position.copy(this.position);

    this.syncRotationToLookAt(new THREE.Vector3(0, 2.0, 4.0));
    this.bindKeyboard();
  }

  private syncRotationToLookAt(target: THREE.Vector3) {
    this._lookMat.lookAt(this.position, target, new THREE.Vector3(0, 1, 0));
    this._lookEuler.setFromRotationMatrix(this._lookMat, 'YXZ');
    this.rotationY = this._lookEuler.y;
    this.targetRotationY = this._lookEuler.y;
    this.rotationX = THREE.MathUtils.clamp(this._lookEuler.x, -Math.PI / 3, Math.PI / 3);
    this.targetRotationX = this.rotationX;
    this.camera.rotation.set(this.rotationX, this.rotationY, 0, 'YXZ');
  }

  public rotateCamera(deltaYaw: number, deltaPitch: number) {
    this.targetRotationY += deltaYaw;
    this.targetRotationX = THREE.MathUtils.clamp(
      this.targetRotationX + deltaPitch,
      -Math.PI / 3.2,
      Math.PI / 3.2
    );
  }

  private bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      soundEngine.init();
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
      }
    });
  }

  public teleport(pos: [number, number, number], lookAt: [number, number, number] = [0, 2.0, -4.0]) {
    this.position.set(pos[0], pos[1], pos[2]);
    this.targetPosition.copy(this.position);
    this.camera.position.copy(this.position);
    this.syncRotationToLookAt(new THREE.Vector3(lookAt[0], lookAt[1], lookAt[2]));
    this.checkEnvironmentTransition();
  }

  public update(
    delta: number,
    elapsed: number,
    isDoorOpen: boolean,
    interactiveObjects: InteractiveObjectRef[]
  ) {
    // 1. Smoothly damp camera yaw & pitch from touch-drag or mouse-drag
    const rotDamp = Math.min(1, delta * 14);
    this.rotationY += (this.targetRotationY - this.rotationY) * rotDamp;
    this.rotationX += (this.targetRotationX - this.rotationX) * rotDamp;
    this.camera.rotation.set(this.rotationX, this.rotationY, 0, 'YXZ');

    // 2. Determine local movement input (forwardInput > 0 means forward, strafeInput > 0 means right)
    let strafeInput = 0;
    let forwardInput = 0;

    if (this.keys.forward || this.buttonWalkForward) forwardInput += 1;
    if (this.keys.backward) forwardInput -= 1;
    if (this.keys.right) strafeInput += 1;
    if (this.keys.left) strafeInput -= 1;

    // Apply virtual thumb joystick input (joystick.y < 0 is pushing thumb UP = forward)
    if (Math.hypot(this.joystick.x, this.joystick.y) > 0.08) {
      strafeInput += this.joystick.x;
      forwardInput += -this.joystick.y;
    }

    const inputMag = Math.hypot(strafeInput, forwardInput);
    this.isWalking = inputMag > 0.08;

    if (this.isWalking) {
      const clampedMag = Math.min(1, inputMag);
      const normStrafe = (strafeInput / inputMag) * clampedMag;
      const normForward = (forwardInput / inputMag) * clampedMag;

      // Camera-relative horizontal basis vectors in Three.js (where -Z is yaw=0 forward, +X is yaw=0 right)
      const sinY = Math.sin(this.rotationY);
      const cosY = Math.cos(this.rotationY);

      const forwardX = -sinY;
      const forwardZ = -cosY;
      const rightX = cosY;
      const rightZ = -sinY;

      const worldMoveX = forwardX * normForward + rightX * normStrafe;
      const worldMoveZ = forwardZ * normForward + rightZ * normStrafe;

      const stepDist = this.speed * delta;
      const nextX = this.targetPosition.x + worldMoveX * stepDist;
      const nextZ = this.targetPosition.z + worldMoveZ * stepDist;

      // Farmhouse door collision check: if door is closed, stop at porch (z >= 3.4)
      let allowedX = true;
      let allowedZ = true;

      if (!isDoorOpen && nextZ < 3.4 && this.targetPosition.z >= 3.4) {
        allowedZ = false; // Must open front door to enter!
      }

      // Interior vs Exterior wall boundaries (allow sliding along walls)
      if (nextZ < 3.0) {
        if (nextX < -5.1 || nextX > 5.1) allowedX = false;
        if (nextZ < -9.6) allowedZ = false;
      } else {
        if (nextX < this.minX || nextX > this.maxX) allowedX = false;
        if (nextZ > this.maxZ) allowedZ = false;
      }

      if (allowedX) {
        this.targetPosition.x = nextX;
      }
      if (allowedZ) {
        this.targetPosition.z = nextZ;
      }

      if (allowedX || allowedZ) {
        this.stepDistance += stepDist * clampedMag;
        if (this.stepDistance > 1.35) {
          soundEngine.playSnowFootstep();
          this.stepDistance = 0;
        }
      }
    }

    // 3. Smooth movement interpolation
    const posDamp = Math.min(1, delta * 12);
    this.position.x += (this.targetPosition.x - this.position.x) * posDamp;
    this.position.z += (this.targetPosition.z - this.position.z) * posDamp;

    // Subtle head-bobbing while walking
    const bob = this.isWalking ? Math.sin(elapsed * 10) * 0.05 : 0;
    const baseHeight = this.position.z < 3.0 ? 2.85 : 1.85; // Cabin floor is at y=0.8, so 2.85 is natural standing eye level
    this.position.y = baseHeight + bob;

    this.camera.position.copy(this.position);

    // Check indoor vs outdoor transition
    this.checkEnvironmentTransition();

    // Check nearest interactive object
    this.updateNearestInteractive(interactiveObjects);
  }

  private checkEnvironmentTransition() {
    const insideNow = this.position.z < 2.5;
    if (insideNow !== this.isInsideHouse) {
      this.isInsideHouse = insideNow;
      soundEngine.setEnvironment(this.isInsideHouse);
    }
  }

  public updateNearestInteractive(interactiveObjects: InteractiveObjectRef[]) {
    let closestDist = Infinity;
    let closestObj: InteractiveObjectRef | null = null;

    for (const obj of interactiveObjects) {
      obj.mesh.getWorldPosition(this._tempVec);

      const dist = this.position.distanceTo(this._tempVec);
      if (dist < 4.5 && dist < closestDist) {
        closestDist = dist;
        closestObj = obj;
      }
    }

    this.nearbyInteractive = closestObj;
  }
}
