import * as THREE from 'three';
import { soundEngine } from '../audio/SoundEngine';
import { InteractiveObjectRef } from './ProceduralWorld';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public targetPosition: THREE.Vector3;
  public rotationY: number = 0;
  public targetRotationY: number = 0;
  public isWalking: boolean = false;
  public speed: number = 4.2;
  public stepDistance: number = 0;
  public isInsideHouse: boolean = false;

  // Key state
  public keys: { forward: boolean; backward: boolean; left: boolean; right: boolean } = {
    forward: false,
    backward: false,
    left: false,
    right: false,
  };

  // Joystick state (-1 to 1)
  public joystick: { x: number; y: number } = { x: 0, y: 0 };
  public buttonWalkForward: boolean = false;

  // Collision and path constraints
  private minX = -12;
  private maxX = 12;
  private minZ = -9.5;
  private maxZ = 24.0;

  // Raycasting for interaction prompts
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  public nearbyInteractive: InteractiveObjectRef | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    // Start along the scenic mountain trail looking towards the farmhouse
    this.position = new THREE.Vector3(0, 1.8, 22.0);
    this.targetPosition = this.position.clone();
    this.camera.position.copy(this.position);
    this.camera.lookAt(0, 2.0, 4.0);

    this.bindKeyboard();
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
    this.camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    this.checkEnvironmentTransition();
  }

  public update(
    delta: number,
    elapsed: number,
    isDoorOpen: boolean,
    interactiveObjects: InteractiveObjectRef[]
  ) {
    // Determine movement direction vector
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.forward || this.buttonWalkForward) moveZ -= 1;
    if (this.keys.backward) moveZ += 1;
    if (this.keys.left) moveX -= 1;
    if (this.keys.right) moveX += 1;

    // Apply touch joystick input
    if (Math.abs(this.joystick.x) > 0.1) moveX += this.joystick.x;
    if (Math.abs(this.joystick.y) > 0.1) moveZ += this.joystick.y;

    const inputMag = Math.hypot(moveX, moveZ);
    this.isWalking = inputMag > 0.1;

    if (this.isWalking) {
      // Normalize
      moveX /= Math.max(1, inputMag);
      moveZ /= Math.max(1, inputMag);

      // Compute step along current viewing angle or trail
      const moveVec = new THREE.Vector3(moveX, 0, moveZ);
      moveVec.normalize();

      const stepDist = this.speed * delta;
      const nextX = this.targetPosition.x + moveVec.x * stepDist;
      const nextZ = this.targetPosition.z + moveVec.y * stepDist;

      // Farmhouse door collision check: if door is closed, stop at porch (z >= 3.8)
      let allowed = true;
      if (!isDoorOpen && nextZ < 3.4 && this.targetPosition.z >= 3.4) {
        allowed = false; // Must open front door to enter!
      }

      // Interior wall boundaries
      if (nextZ < 3.0) {
        // Inside house boundaries
        if (nextX < -5.2 || nextX > 5.2 || nextZ < -9.8) {
          allowed = false;
        }
      } else {
        // Outside boundaries
        if (nextX < this.minX || nextX > this.maxX || nextZ > this.maxZ) {
          allowed = false;
        }
      }

      if (allowed) {
        this.targetPosition.x = nextX;
        this.targetPosition.z = nextZ;

        // Snow footsteps sound pacing
        this.stepDistance += stepDist;
        if (this.stepDistance > 1.4) {
          soundEngine.playSnowFootstep();
          this.stepDistance = 0;
        }
      }
    }

    // Smooth movement interpolation
    this.position.x += (this.targetPosition.x - this.position.x) * Math.min(1, delta * 12);
    this.position.z += (this.targetPosition.z - this.position.z) * Math.min(1, delta * 12);

    // Subtle head-bobbing while walking
    const bob = this.isWalking ? Math.sin(elapsed * 10) * 0.05 : 0;
    const baseHeight = this.position.z < 3.0 ? 2.3 : 1.8; // Interior floor is slightly elevated
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

  private updateNearestInteractive(interactiveObjects: InteractiveObjectRef[]) {
    let closestDist = Infinity;
    let closestObj: InteractiveObjectRef | null = null;

    for (const obj of interactiveObjects) {
      const worldPos = new THREE.Vector3();
      obj.mesh.getWorldPosition(worldPos);

      const dist = this.position.distanceTo(worldPos);
      if (dist < 4.2 && dist < closestDist) {
        closestDist = dist;
        closestObj = obj;
      }
    }

    this.nearbyInteractive = closestObj;
  }
}
