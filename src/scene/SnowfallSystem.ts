import * as THREE from 'three';

export type SnowPreset = 'gentle' | 'cozy' | 'blizzard';

export class SnowfallSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleCount: number = 2200;
  private positions: Float32Array;
  private velocities: Float32Array;
  private swaySeeds: Float32Array;
  private bounds = {
    x: 75,
    yBottom: -0.5,
    yTop: 35,
    z: 75,
  };
  private windVector: THREE.Vector3 = new THREE.Vector3(1.2, 0, 0.4);
  private currentSpeedMultiplier: number = 1.0;
  private targetSpeedMultiplier: number = 1.0;
  private texture: THREE.Texture;

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.swaySeeds = new Float32Array(this.particleCount);

    this.texture = this.createSnowflakeTexture();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = (Math.random() - 0.5) * this.bounds.x * 2;
      this.positions[i3 + 1] = Math.random() * (this.bounds.yTop - this.bounds.yBottom) + this.bounds.yBottom;
      this.positions[i3 + 2] = (Math.random() - 0.5) * this.bounds.z * 2;

      // Variable fall velocities (faster/slower flakes for depth)
      this.velocities[i3] = (Math.random() - 0.5) * 0.4;
      this.velocities[i3 + 1] = -(1.5 + Math.random() * 2.2); // downward speed
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.4;

      this.swaySeeds[i] = Math.random() * Math.PI * 2;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.38,
      map: this.texture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  private createSnowflakeTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(240, 248, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(220, 235, 255, 0.25)');
    grad.addColorStop(1, 'rgba(200, 225, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    // Subtle 6-point crystal flare
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    for (let a = 0; a < 3; a++) {
      const angle = (a * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(32 + Math.cos(angle) * 18, 32 + Math.sin(angle) * 18);
      ctx.lineTo(32 - Math.cos(angle) * 18, 32 - Math.sin(angle) * 18);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public setPreset(preset: SnowPreset) {
    switch (preset) {
      case 'gentle':
        this.targetSpeedMultiplier = 0.65;
        this.material.size = 0.28;
        this.material.opacity = 0.65;
        this.windVector.set(0.4, 0, 0.1);
        break;
      case 'cozy':
        this.targetSpeedMultiplier = 1.0;
        this.material.size = 0.38;
        this.material.opacity = 0.85;
        this.windVector.set(1.1, 0, 0.35);
        break;
      case 'blizzard':
        this.targetSpeedMultiplier = 1.9;
        this.material.size = 0.48;
        this.material.opacity = 0.95;
        this.windVector.set(3.2, 0, 1.2);
        break;
    }
  }

  public setIntensity(intensity: number) {
    // 0.2 = light, 1.0 = heavy
    this.targetSpeedMultiplier = THREE.MathUtils.lerp(0.5, 2.2, intensity);
    this.material.size = THREE.MathUtils.lerp(0.24, 0.52, intensity);
    this.material.opacity = THREE.MathUtils.lerp(0.5, 0.95, intensity);
    this.windVector.set(intensity * 2.5, 0, intensity * 0.8);
  }

  public update(delta: number, elapsed: number, centerPos?: THREE.Vector3) {
    // Smooth transition of speed multiplier
    this.currentSpeedMultiplier += (this.targetSpeedMultiplier - this.currentSpeedMultiplier) * Math.min(1, delta * 3);

    const pos = this.positions;
    const vels = this.velocities;
    const seeds = this.swaySeeds;
    const count = this.particleCount;

    // Center wrapping around player/camera if provided
    const cx = centerPos ? centerPos.x : 0;
    const cz = centerPos ? centerPos.z : 0;

    const gustSway = Math.sin(elapsed * 1.5) * 0.4;
    const windX = (this.windVector.x + gustSway) * this.currentSpeedMultiplier;
    const windZ = this.windVector.z * this.currentSpeedMultiplier;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = seeds[i];
      const individualSwayX = Math.sin(elapsed * 2.2 + seed) * 0.6;
      const individualSwayZ = Math.cos(elapsed * 1.8 + seed) * 0.4;

      // Update positions
      pos[i3] += (vels[i3] + windX + individualSwayX) * delta;
      pos[i3 + 1] += vels[i3 + 1] * this.currentSpeedMultiplier * delta;
      pos[i3 + 2] += (vels[i3 + 2] + windZ + individualSwayZ) * delta;

      // Wrap vertically
      if (pos[i3 + 1] < this.bounds.yBottom) {
        pos[i3 + 1] = this.bounds.yTop;
        pos[i3] = cx + (Math.random() - 0.5) * this.bounds.x * 2;
        pos[i3 + 2] = cz + (Math.random() - 0.5) * this.bounds.z * 2;
      }

      // Wrap horizontally around focal point
      const dx = pos[i3] - cx;
      if (dx > this.bounds.x) pos[i3] -= this.bounds.x * 2;
      else if (dx < -this.bounds.x) pos[i3] += this.bounds.x * 2;

      const dz = pos[i3 + 2] - cz;
      if (dz > this.bounds.z) pos[i3 + 2] -= this.bounds.z * 2;
      else if (dz < -this.bounds.z) pos[i3 + 2] += this.bounds.z * 2;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
