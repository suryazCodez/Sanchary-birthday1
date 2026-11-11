import * as THREE from 'three';
import { TreasureChest, INITIAL_CHESTS } from '../types/game';
import { computeFireplaceFlickerState } from '../utils/fireplaceLighting';

export interface InteractiveObjectRef {
  type: 'chest' | 'door' | 'cake' | 'photo' | 'tv' | 'parents';
  id?: string;
  data?: any;
  mesh: THREE.Object3D;
  prompt: string;
}

export class ProceduralWorld {
  public scene: THREE.Scene;
  public interactiveObjects: InteractiveObjectRef[] = [];
  public doorPivot: THREE.Group | null = null;
  public isDoorOpen: boolean = false;
  public candleFlames: THREE.Mesh[] = [];
  public candleLights: THREE.PointLight[] = [];
  public fireplaceLight: THREE.PointLight | null = null;
  public fireplaceBounceLight: THREE.PointLight | null = null;
  public fireplaceEmberMaterial: THREE.MeshStandardMaterial | null = null;
  public indoorRoomLights: { light: THREE.PointLight; baseIntensity: number }[] = [];
  public roomAmbientLevel: number = 1.0;
  public targetRoomAmbientLevel: number = 1.0;
  public fireplaceFlames: THREE.Mesh[] = [];
  public chimneySmoke: THREE.Points | null = null;
  public balloonGroup: THREE.Group | null = null;
  public tvVideoMesh: THREE.Mesh | null = null;
  public tvVideoElement: HTMLVideoElement | null = null;
  private tvDirectVideoTexture: THREE.VideoTexture | null = null;
  private tvCanvas: HTMLCanvasElement | null = null;
  private tvCtx: CanvasRenderingContext2D | null = null;
  private tvCanvasTexture: THREE.CanvasTexture | null = null;
  private starField: THREE.Points | null = null;
  private starMaterial: THREE.PointsMaterial | null = null;
  public photoMeshes: THREE.Mesh[] = [];
  public momModel: THREE.Group | null = null;
  public dadModel: THREE.Group | null = null;
  public cakeGroup: THREE.Group | null = null;
  public cakeSlice: THREE.Mesh | null = null;
  public cakeSliceGroup: THREE.Group | null = null;
  public cakeKnifeGroup: THREE.Group | null = null;
  public cakeSparkles: THREE.Points | null = null;
  private cakeCutAnimProgress: number = 0;
  private isCakeCutCompleted: boolean = false;
  public chestGroups: Map<string, THREE.Group> = new Map();
  public fairyLightsMaterial: THREE.MeshBasicMaterial | null = null;

  private textureLoader: THREE.TextureLoader;
  private smokeCount = 80;
  private smokePositions: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.smokePositions = new Float32Array(this.smokeCount * 3);
  }

  public async buildWorld() {
    this.setupEnvironmentAndFog();
    this.buildStarryNightSky();
    this.buildTerrainAndMountains();
    this.buildPineForest();
    this.buildFarmhouseExterior();
    this.buildFarmhouseInterior();
    this.buildDecorationsAndBalloons();
    this.buildBirthdayCake();
    this.buildPhotoFrames();
    this.buildVirtualTV();
    this.buildParents();
    this.buildTreasureChests();
    this.setupLighting();
  }

  private setupEnvironmentAndFog() {
    // Deep Alpine Starry Night Sky & Midnight Fog
    this.scene.background = new THREE.Color(0x040711);
    this.scene.fog = new THREE.FogExp2(0x060b18, 0.012);
  }

  private buildStarryNightSky() {
    // 1. 2,800 Glittering Stars across the Night Sky Hemisphere Dome
    const starCount = 2800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff), // Diamond white
      new THREE.Color(0xfff4d2), // Warm gold starlight
      new THREE.Color(0xcce2ff), // Crisp ice blue
      new THREE.Color(0xffd6e0), // Faint rose star
    ];

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Distribute on a hemisphere dome of radius 115..165
      const radius = 115 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.08 + Math.random() * 0.92); // Above horizon

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.cos(phi);
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const col = palette[i % palette.length];
      const brightness = 0.65 + Math.random() * 0.35;
      colors[i3] = col.r * brightness;
      colors[i3 + 1] = col.g * brightness;
      colors[i3 + 2] = col.b * brightness;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.starMaterial = new THREE.PointsMaterial({
      size: 0.95,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      fog: false,
      depthWrite: false,
    });

    this.starField = new THREE.Points(starGeo, this.starMaterial);
    this.starField.frustumCulled = false;
    this.scene.add(this.starField);

    // 2. Luminous Full Alpine Moon & Soft Atmospheric Halo high above the peaks
    const moonGroup = new THREE.Group();
    moonGroup.position.set(-34, 52, -68);

    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfef9e7, fog: false })
    );
    moonGroup.add(moonMesh);

    const haloMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8.2, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x9ec5ff,
        transparent: true,
        opacity: 0.16,
        fog: false,
        depthWrite: false,
      })
    );
    moonGroup.add(haloMesh);

    this.scene.add(moonGroup);
  }

  private setupLighting() {
    // Starry Night Sky / Snow Bounce Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x4b6cb7, 0x182848, 0.55);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Cool Silvery-Blue Alpine Moonlight casting crisp shadows on snow
    const moonLight = new THREE.DirectionalLight(0xa8c8ff, 0.95);
    moonLight.position.set(-30, 45, -40);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 140;
    const d = 42;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0003;
    this.scene.add(moonLight);

    // Porch warm golden lantern lights (extra inviting against the night sky)
    const porchLight1 = new THREE.PointLight(0xff9e2c, 2.8, 16, 1.4);
    porchLight1.position.set(1.9, 3.4, 5.6);
    porchLight1.castShadow = true;
    this.scene.add(porchLight1);

    const porchLight2 = new THREE.PointLight(0xff9e2c, 2.8, 16, 1.4);
    porchLight2.position.set(-1.9, 3.4, 5.6);
    porchLight2.castShadow = true;
    this.scene.add(porchLight2);

    // Indoor Dining Table warm pendant lamp (2700K warm glow)
    const tableLight = new THREE.PointLight(0xffdfa9, 2.5, 16, 1.6);
    tableLight.position.set(0, 4.2, -3.2);
    tableLight.castShadow = true;
    this.scene.add(tableLight);
    this.indoorRoomLights.push({ light: tableLight, baseIntensity: 2.5 });

    // Living Room ambient warm wash
    const livingFill = new THREE.PointLight(0xffc585, 1.5, 18, 1.8);
    livingFill.position.set(-2.5, 3.8, -7.5);
    this.scene.add(livingFill);
    this.indoorRoomLights.push({ light: livingFill, baseIntensity: 1.5 });

    // Primary Fireplace dancing hearth light (placed just outside firebox opening so it illuminates the room)
    this.fireplaceLight = new THREE.PointLight(0xff6a1a, 3.2, 15, 1.35);
    this.fireplaceLight.position.set(-3.85, 1.45, -4.5);
    this.scene.add(this.fireplaceLight);

    // Secondary Fireplace warm bounce light on ceiling beams, mantelpiece & Turkish rug
    this.fireplaceBounceLight = new THREE.PointLight(0xff8c3b, 1.1, 14, 1.6);
    this.fireplaceBounceLight.position.set(-3.1, 2.35, -4.5);
    this.scene.add(this.fireplaceBounceLight);
  }

  private buildTerrainAndMountains() {
    // 1. Playable snowy valley terrain
    const terrainGeo = new THREE.PlaneGeometry(160, 160, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Path depression for the walking trail
      const distToPath = Math.abs(x - Math.sin(z * 0.1) * 2.2);
      let y = Math.sin(x * 0.05) * 1.5 + Math.cos(z * 0.06) * 1.8;

      // Keep farmhouse area flat
      const distToHouse = Math.hypot(x, z - (-4));
      if (distToHouse < 14) {
        y *= Math.max(0, (distToHouse - 7) / 7);
      } else if (distToPath < 3.5 && z > 2) {
        y *= 0.3; // flattened path
      } else {
        // Natural mountain undulating hills
        y += Math.sin(x * 0.12 + z * 0.08) * 1.2;
      }
      pos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xedf4fc,
      roughness: 0.88,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, snowMat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    // Stone flagstone trail
    const pathGroup = new THREE.Group();
    const stoneGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.1, 7);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x56606f, roughness: 0.9 });
    for (let z = 22; z >= 6; z -= 1.4) {
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      const curveX = Math.sin(z * 0.1) * 2.2 + (Math.random() - 0.5) * 0.4;
      stone.position.set(curveX, 0.06, z);
      stone.rotation.y = Math.random() * Math.PI;
      stone.scale.set(1 + Math.random() * 0.3, 1, 1 + Math.random() * 0.3);
      stone.receiveShadow = true;
      pathGroup.add(stone);
    }
    this.scene.add(pathGroup);

    // 2. Surrounding majestic mountain peaks
    const mountainGroup = new THREE.Group();
    const peakGeo = new THREE.ConeGeometry(24, 48, 6);
    const peakSnowMat = new THREE.MeshStandardMaterial({
      color: 0xd9e5f5,
      roughness: 0.75,
      metalness: 0.1,
    });
    const peakRockMat = new THREE.MeshStandardMaterial({
      color: 0x2e3846,
      roughness: 0.95,
    });

    const peakConfigs = [
      { x: -55, z: -45, h: 58, r: 28 },
      { x: 0, z: -70, h: 65, r: 34 },
      { x: 50, z: -55, h: 52, r: 26 },
      { x: -65, z: 20, h: 46, r: 24 },
      { x: 65, z: 15, h: 48, r: 25 },
      { x: -45, z: 60, h: 42, r: 22 },
      { x: 45, z: 60, h: 44, r: 23 },
    ];

    peakConfigs.forEach(cfg => {
      const peak = new THREE.Group();
      const base = new THREE.Mesh(peakGeo, peakRockMat);
      base.scale.set(cfg.r / 24, cfg.h / 48, cfg.r / 24);
      base.position.y = cfg.h * 0.45;

      // Snow-capped apex
      const cap = new THREE.Mesh(peakGeo, peakSnowMat);
      cap.scale.set((cfg.r / 24) * 0.65, (cfg.h / 48) * 0.45, (cfg.r / 24) * 0.65);
      cap.position.y = cfg.h * 0.72;

      peak.add(base);
      peak.add(cap);
      peak.position.set(cfg.x, 0, cfg.z);
      mountainGroup.add(peak);
    });
    this.scene.add(mountainGroup);
  }

  private buildPineForest() {
    // 3-part composite evergreen pine trees with snow on boughs
    const treeGroup = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.95 });

    const foliageTier1 = new THREE.ConeGeometry(2.4, 3.2, 7);
    const foliageTier2 = new THREE.ConeGeometry(1.8, 2.6, 7);
    const foliageTier3 = new THREE.ConeGeometry(1.2, 2.0, 7);
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f3b2b, roughness: 0.85 });

    const snowCapGeo = new THREE.ConeGeometry(1.25, 0.8, 7);
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf0f6ff, roughness: 0.7 });

    const treePositions = [
      // Along trail left and right
      [-8, 16], [-12, 19], [-7, 10], [-10, 5], [-14, 2],
      [8, 18], [11, 14], [9, 8], [12, 3], [14, -2],
      // Surrounding farmhouse
      [-9, -4], [-11, -9], [-7, -14], [0, -16], [8, -14], [10, -8], [9, -3],
      // Mountain slopes
      [-22, 10], [-26, -5], [-20, -18], [24, 12], [28, -6], [22, -18]
    ];

    treePositions.forEach(([x, z]) => {
      const tree = new THREE.Group();
      const s = 0.85 + Math.random() * 0.45;

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      const t1 = new THREE.Mesh(foliageTier1, pineMat);
      t1.position.y = 2.6;
      t1.castShadow = true;
      tree.add(t1);

      const t2 = new THREE.Mesh(foliageTier2, pineMat);
      t2.position.y = 4.0;
      t2.castShadow = true;
      tree.add(t2);

      const t3 = new THREE.Mesh(foliageTier3, pineMat);
      t3.position.y = 5.2;
      t3.castShadow = true;
      tree.add(t3);

      const snow = new THREE.Mesh(snowCapGeo, snowCapMat);
      snow.position.y = 5.7;
      tree.add(snow);

      tree.position.set(x, 0, z);
      tree.scale.set(s, s, s);
      tree.rotation.y = Math.random() * Math.PI * 2;
      treeGroup.add(tree);
    });

    this.scene.add(treeGroup);
  }

  private buildFarmhouseExterior() {
    const house = new THREE.Group();

    // Wood materials
    const logMat = new THREE.MeshStandardMaterial({ color: 0x513829, roughness: 0.85 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x362318, roughness: 0.8 });
    const snowRoofMat = new THREE.MeshStandardMaterial({ color: 0xf3f7fc, roughness: 0.65 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4f56, roughness: 0.95 });

    // House Base / Foundation
    const foundationGeo = new THREE.BoxGeometry(12.4, 0.8, 14.4);
    const foundation = new THREE.Mesh(foundationGeo, stoneMat);
    foundation.position.set(0, 0.4, -4);
    foundation.receiveShadow = true;
    house.add(foundation);

    // Front Porch Decking
    const porchGeo = new THREE.BoxGeometry(6.4, 0.4, 3.2);
    const porch = new THREE.Mesh(porchGeo, darkWoodMat);
    porch.position.set(0, 0.6, 4.4);
    porch.receiveShadow = true;
    house.add(porch);

    // Porch Steps
    const stepGeo = new THREE.BoxGeometry(4.0, 0.25, 0.9);
    const step = new THREE.Mesh(stepGeo, stoneMat);
    step.position.set(0, 0.25, 6.2);
    step.receiveShadow = true;
    house.add(step);

    // Porch Support Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8);
    const p1 = new THREE.Mesh(pillarGeo, darkWoodMat);
    p1.position.set(-2.8, 2.7, 5.6);
    p1.castShadow = true;
    house.add(p1);

    const p2 = new THREE.Mesh(pillarGeo, darkWoodMat);
    p2.position.set(2.8, 2.7, 5.6);
    p2.castShadow = true;
    house.add(p2);

    // Porch Roof Canopy
    const porchRoofGeo = new THREE.BoxGeometry(6.8, 0.3, 3.6);
    const porchRoof = new THREE.Mesh(porchRoofGeo, snowRoofMat);
    porchRoof.position.set(0, 4.8, 4.6);
    porchRoof.rotation.x = 0.1;
    porchRoof.castShadow = true;
    house.add(porchRoof);

    // Front Wall with Doorway cutout
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.0, 0.5), logMat);
    frontWallLeft.position.set(-3.6, 3.2, 2.8);
    frontWallLeft.castShadow = true;
    house.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.0, 0.5), logMat);
    frontWallRight.position.set(3.6, 3.2, 2.8);
    frontWallRight.castShadow = true;
    house.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 0.5), logMat);
    frontWallTop.position.set(0, 4.8, 2.8);
    house.add(frontWallTop);

    // Exterior Windows with warm glass
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffd180,
      emissive: 0xffaa33,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.2), windowGlassMat);
    win1.position.set(-3.6, 3.0, 3.0);
    house.add(win1);

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.2), windowGlassMat);
    win2.position.set(3.6, 3.0, 3.0);
    house.add(win2);

    // Back & Side exterior walls
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12.0, 5.0, 0.5), logMat);
    backWall.position.set(0, 3.2, -10.8);
    backWall.castShadow = true;
    house.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.0, 14.0), logMat);
    leftWall.position.set(-5.9, 3.2, -4.0);
    leftWall.castShadow = true;
    house.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.0, 14.0), logMat);
    rightWall.position.set(5.9, 3.2, -4.0);
    rightWall.castShadow = true;
    house.add(rightWall);

    // Gable Roof (Thick Alpine Snow on Wood)
    const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.5, 15.0), snowRoofMat);
    roofLeft.position.set(-3.2, 6.8, -4.0);
    roofLeft.rotation.z = 0.65;
    roofLeft.castShadow = true;
    house.add(roofLeft);

    const roofRight = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.5, 15.0), snowRoofMat);
    roofRight.position.set(3.2, 6.8, -4.0);
    roofRight.rotation.z = -0.65;
    roofRight.castShadow = true;
    house.add(roofRight);

    // Chimney (Stone + smoke)
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), stoneMat);
    chimney.position.set(-4.5, 7.2, -4.5);
    chimney.castShadow = true;
    house.add(chimney);

    // Procedural chimney smoke points
    const smokeGeo = new THREE.BufferGeometry();
    for (let i = 0; i < this.smokeCount; i++) {
      const i3 = i * 3;
      this.smokePositions[i3] = -4.5 + (Math.random() - 0.5) * 0.4;
      this.smokePositions[i3 + 1] = 9.5 + Math.random() * 6.0;
      this.smokePositions[i3 + 2] = -4.5 + (Math.random() - 0.5) * 0.4;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.6,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.chimneySmoke = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(this.chimneySmoke);

    // Interactive Front Entrance Door (Swings open!)
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-1.1, 0.8, 2.8); // Hinge location

    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x61341c, roughness: 0.7 })
    );
    doorMesh.position.set(1.1, 1.6, 0); // centered relative to pivot
    doorMesh.castShadow = true;

    // Brass Handle
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 })
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(1.9, 1.6, 0.12);
    doorMesh.add(handle);

    // Festive Birthday Wreath on Door
    const wreathGeo = new THREE.TorusGeometry(0.45, 0.14, 8, 24);
    const wreathMat = new THREE.MeshStandardMaterial({ color: 0x1a4329, roughness: 0.9 });
    const wreath = new THREE.Mesh(wreathGeo, wreathMat);
    wreath.position.set(1.1, 2.1, 0.12);
    doorMesh.add(wreath);

    // Red ribbon bow on wreath
    const bow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd91b35, roughness: 0.4 })
    );
    bow.position.set(1.1, 1.65, 0.2);
    doorMesh.add(bow);

    this.doorPivot.add(doorMesh);
    house.add(this.doorPivot);

    this.interactiveObjects.push({
      type: 'door',
      mesh: doorMesh,
      prompt: 'Click or press [E] to Open Front Door',
    });

    this.scene.add(house);
  }

  private buildFarmhouseInterior() {
    const interior = new THREE.Group();

    // 1. Polished Hardwood Planks Floor
    const floorGeo = new THREE.PlaneGeometry(11.4, 13.4);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.45,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0.81, -4.0);
    floor.receiveShadow = true;
    interior.add(floor);

    // Cozy Turkish-style woven rug under the dining table
    const rugGeo = new THREE.PlaneGeometry(5.5, 6.5);
    rugGeo.rotateX(-Math.PI / 2);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x80232c,
      roughness: 0.9,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(0, 0.82, -3.2);
    rug.receiveShadow = true;
    interior.add(rug);

    // 2. Stone Fireplace & Chimney Hearth (anchored flush along the Left Wall X = -5.6)
    const hearthStoneMat = new THREE.MeshStandardMaterial({ color: 0x43464b, roughness: 0.88 });
    const fireplaceHearth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.6, 2.6), hearthStoneMat);
    fireplaceHearth.position.set(-5.05, 2.4, -4.5);
    fireplaceHearth.receiveShadow = true;
    interior.add(fireplaceHearth);

    // Raised Stone Hearth Apron in front of the fire
    const hearthApron = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 2.8), hearthStoneMat);
    hearthApron.position.set(-4.65, 0.88, -4.5);
    hearthApron.receiveShadow = true;
    interior.add(hearthApron);

    // Firebox recessed dark backplate (behind the logs & flames at X = -4.46)
    const firebox = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.55, 1.75),
      new THREE.MeshBasicMaterial({ color: 0x120c09 })
    );
    firebox.position.set(-4.46, 1.68, -4.5);
    interior.add(firebox);

    // Burning Logs (oriented along Z inside the open hearth)
    const logGeo = new THREE.CylinderGeometry(0.11, 0.12, 1.15, 8);
    const fireLogMat = new THREE.MeshStandardMaterial({
      color: 0x2a1508,
      emissive: 0x3d1302,
      emissiveIntensity: 0.45,
      roughness: 0.9,
    });
    const fl1 = new THREE.Mesh(logGeo, fireLogMat);
    fl1.position.set(-4.18, 1.12, -4.5);
    fl1.rotation.x = Math.PI / 2 - 0.18;
    fl1.rotation.z = 0.15;
    interior.add(fl1);

    const fl2 = new THREE.Mesh(logGeo, fireLogMat);
    fl2.position.set(-4.08, 1.12, -4.5);
    fl2.rotation.x = Math.PI / 2 + 0.2;
    fl2.rotation.z = -0.15;
    interior.add(fl2);

    // Glowing Ember Bed beneath the logs
    this.fireplaceEmberMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff4500,
      emissiveIntensity: 1.8,
      roughness: 0.6,
    });
    const emberBed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.48, 0.14, 14),
      this.fireplaceEmberMaterial
    );
    emberBed.scale.set(0.85, 1, 1.55);
    emberBed.position.set(-4.15, 1.02, -4.5);
    interior.add(emberBed);

    // Animated Multi-Layered Fire Flame Cones (outer amber + inner bright gold core)
    const outerFlameMat = new THREE.MeshBasicMaterial({ color: 0xff5a00 });
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
    const flameOffsets: [number, number, number, number][] = [
      [-4.14, 1.48, -4.5, 1.15],
      [-4.16, 1.4, -4.18, 0.95],
      [-4.16, 1.42, -4.82, 0.98],
      [-4.06, 1.36, -4.34, 0.88],
      [-4.06, 1.38, -4.66, 0.9],
    ];
    flameOffsets.forEach(([fx, fy, fz, scale], idx) => {
      const mat = idx % 2 === 0 ? outerFlameMat : innerFlameMat;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.72 * scale, 8), mat);
      flame.position.set(fx, fy, fz);
      interior.add(flame);
      this.fireplaceFlames.push(flame);
    });

    // Wooden Fireplace Mantelpiece with Birthday Garland
    const mantel = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.24, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x5c3616, roughness: 0.55 })
    );
    mantel.position.set(-4.35, 2.65, -4.5);
    interior.add(mantel);

    // 3. Dining Table & Chairs
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x5a341a, roughness: 0.6 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 3.8), tableMat);
    tableTop.position.set(0, 2.2, -3.2);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    interior.add(tableTop);

    // Festive Tablecloth
    const clothMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.7 });
    const tableCloth = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.16, 3.4), clothMat);
    tableCloth.position.set(0, 2.21, -3.2);
    tableCloth.receiveShadow = true;
    interior.add(tableCloth);

    // 4 Table Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6);
    const legPositions = [
      [-1.0, -4.8], [1.0, -4.8],
      [-1.0, -1.6], [1.0, -1.6]
    ];
    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(lx, 1.5, lz);
      leg.castShadow = true;
      interior.add(leg);
    });

    // 4. Exposed Wooden Ceiling Beams
    const beamGeo = new THREE.BoxGeometry(0.35, 0.4, 13.4);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d200e, roughness: 0.75 });
    for (let bx = -4.5; bx <= 4.5; bx += 2.25) {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(bx, 5.2, -4.0);
      interior.add(beam);
    }

    this.scene.add(interior);
  }

  private buildDecorationsAndBalloons() {
    this.balloonGroup = new THREE.Group();

    // Floating Pastel Balloons
    const balloonColors = [0xff6b8b, 0xffd166, 0x06d6a0, 0x118ab2, 0xa56de2, 0xff99c8];
    const balloonGeo = new THREE.SphereGeometry(0.38, 16, 16);
    balloonGeo.scale(1, 1.25, 1); // Egg / balloon shape

    const clusterPositions = [
      // Near dining table
      [-1.8, 3.8, -1.8], [-1.5, 4.2, -1.6], [-2.0, 4.0, -2.1],
      [1.8, 3.9, -1.8], [1.6, 4.3, -1.5], [2.1, 4.1, -2.0],
      // Near fireplace
      [-3.4, 3.6, -3.2], [-3.7, 4.0, -3.0],
      // Near TV
      [3.4, 3.7, -7.0], [3.8, 4.1, -6.8]
    ];

    clusterPositions.forEach((pos, idx) => {
      const col = balloonColors[idx % balloonColors.length];
      const bMat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.25,
        metalness: 0.1,
      });
      const balloon = new THREE.Mesh(balloonGeo, bMat);
      balloon.position.set(pos[0], pos[1], pos[2]);
      balloon.castShadow = true;
      this.balloonGroup!.add(balloon);

      // Ribbon string
      const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.8, 3);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
      const string = new THREE.Mesh(stringGeo, stringMat);
      string.position.set(pos[0], pos[1] - 1.0, pos[2]);
      this.balloonGroup!.add(string);
    });

    this.scene.add(this.balloonGroup);

    // Glowing Fairy Light Strands across beams
    const fairyGroup = new THREE.Group();
    const fairyLightGeo = new THREE.SphereGeometry(0.06, 6, 6);
    this.fairyLightsMaterial = new THREE.MeshBasicMaterial({ color: 0xffe099 });

    for (let fx = -4.2; fx <= 4.2; fx += 0.6) {
      for (let fz = -9.5; fz <= 1.5; fz += 2.8) {
        const fairy = new THREE.Mesh(fairyLightGeo, this.fairyLightsMaterial);
        // Gentle sagging catenary curve
        const sag = Math.sin((fx / 4.2 + 1) * Math.PI) * 0.25;
        fairy.position.set(fx, 4.8 - sag, fz);
        fairyGroup.add(fairy);
      }
    }
    this.scene.add(fairyGroup);

    // Celebratory Bunting Banner on Feature Back Wall: "HAPPY BIRTHDAY BESTIE"
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Golden banner background with gold foil sparkles
    ctx.fillStyle = '#2a1a1f';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#e0a96d';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 1004, 236);

    ctx.fillStyle = '#ffdf79';
    ctx.font = 'bold 64px "Cormorant Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ HAPPY BIRTHDAY SANCHARY! ✨', 512, 110);

    ctx.fillStyle = '#fceade';
    ctx.font = '32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('To our dearest Sanchary: Shine bright like the alpine stars!', 512, 185);

    const bannerTexture = new THREE.CanvasTexture(canvas);
    bannerTexture.colorSpace = THREE.SRGBColorSpace;
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTexture,
      roughness: 0.4,
    });
    const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), bannerMat);
    bannerMesh.position.set(0, 4.1, -10.5);
    this.scene.add(bannerMesh);
  }

  private buildBirthdayCake() {
    this.cakeGroup = new THREE.Group();
    this.cakeGroup.position.set(0, 2.3, -3.2);

    // Porcelain Cake Stand
    const standMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
    const standPlate = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.08, 24), standMat);
    standPlate.position.y = 0.04;
    standPlate.receiveShadow = true;
    this.cakeGroup.add(standPlate);

    const standPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.3, 16), standMat);
    standPedestal.position.y = -0.15;
    this.cakeGroup.add(standPedestal);

    // Cake Bottom Tier (Velvet chocolate frosting)
    const cakeBottomMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd9, roughness: 0.5 });
    const bottomTier = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.45, 24), cakeBottomMat);
    bottomTier.position.y = 0.3;
    bottomTier.castShadow = true;
    this.cakeGroup.add(bottomTier);

    // Cake Top Tier (Berry vanilla swirl)
    const cakeTopMat = new THREE.MeshStandardMaterial({ color: 0xfcb8d2, roughness: 0.45 });
    const topTier = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 24), cakeTopMat);
    topTier.position.y = 0.72;
    topTier.castShadow = true;
    this.cakeGroup.add(topTier);

    // Decorative Strawberries / Cherries on Top
    const berryGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.3 });
    for (let b = 0; b < 6; b++) {
      const angle = (b * Math.PI * 2) / 6;
      const berry = new THREE.Mesh(berryGeo, berryMat);
      berry.position.set(Math.cos(angle) * 0.45, 0.95, Math.sin(angle) * 0.45);
      this.cakeGroup.add(berry);
    }

    // Interactive Multi-Layered Cut Wedge (displaces smoothly onto side plate when cut)
    this.cakeSliceGroup = new THREE.Group();
    this.cakeSliceGroup.position.set(0, 0, 0);
    this.cakeSliceGroup.visible = false;

    const sliceOuterMat = new THREE.MeshStandardMaterial({ color: 0xfcb8d2, roughness: 0.42 });
    const sliceSpongeMat = new THREE.MeshStandardMaterial({ color: 0x5c2c16, roughness: 0.65 });
    const sliceCreamMat = new THREE.MeshStandardMaterial({ color: 0xfff5f8, roughness: 0.35 });

    const wedgeOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.66, 0.66, 0.41, 12, 1, false, 0, Math.PI / 4),
      sliceOuterMat
    );
    wedgeOuter.position.y = 0.72;
    this.cakeSliceGroup.add(wedgeOuter);
    this.cakeSlice = wedgeOuter;

    // Inner chocolate sponge & berry cream layers visible on the cut wedge
    const spongeLayer1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 0.14, 10, 1, false, -0.02, Math.PI / 4 + 0.04),
      sliceSpongeMat
    );
    spongeLayer1.position.y = 0.62;
    this.cakeSliceGroup.add(spongeLayer1);

    const creamFilling = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.08, 10, 1, false, -0.02, Math.PI / 4 + 0.04),
      sliceCreamMat
    );
    creamFilling.position.y = 0.73;
    this.cakeSliceGroup.add(creamFilling);

    const wedgeCherry = new THREE.Mesh(berryGeo, berryMat);
    wedgeCherry.position.set(0.36, 0.96, 0.15);
    this.cakeSliceGroup.add(wedgeCherry);

    this.cakeGroup.add(this.cakeSliceGroup);

    // Side porcelain dessert plate waiting for Sanchary's first slice
    const sidePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.36, 0.04, 20),
      standMat
    );
    sidePlate.position.set(1.38, 0.02, 0.55);
    this.cakeGroup.add(sidePlate);

    // 5 Birthday Candles with glowing flames
    const candleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.3 });
    const flameGeo = new THREE.ConeGeometry(0.035, 0.12, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const candleOffsets = [
      [0, 0],
      [0.22, 0.22],
      [-0.22, 0.22],
      [0.22, -0.22],
      [-0.22, -0.22]
    ];

    candleOffsets.forEach(([cx, cz], i) => {
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(cx, 1.1, cz);
      candle.castShadow = true;
      this.cakeGroup!.add(candle);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cx, 1.34, cz);
      this.cakeGroup!.add(flame);
      this.candleFlames.push(flame);

      // Point light for candles
      if (i === 0) {
        const cLight = new THREE.PointLight(0xffaa22, 1.8, 5, 1.5);
        cLight.position.set(0, 1.4, 0);
        this.cakeGroup!.add(cLight);
        this.candleLights.push(cLight);
      }
    });

    // Composite 3D Silver Pastry Knife (Blade + Brass Bolster + Pearl Handle)
    this.cakeKnifeGroup = new THREE.Group();
    const knifeBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.07, 0.62),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.12 })
    );
    knifeBlade.position.set(0, 0, -0.15);
    this.cakeKnifeGroup.add(knifeBlade);

    const knifeBolster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.22 })
    );
    knifeBolster.rotation.x = Math.PI / 2;
    knifeBolster.position.set(0, 0, 0.18);
    this.cakeKnifeGroup.add(knifeBolster);

    const knifeHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.038, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff8eb, roughness: 0.3, metalness: 0.1 })
    );
    knifeHandle.rotation.x = Math.PI / 2;
    knifeHandle.position.set(0, 0, 0.36);
    this.cakeKnifeGroup.add(knifeHandle);

    this.cakeKnifeGroup.position.set(1.12, 0.06, 0);
    this.cakeKnifeGroup.rotation.y = -0.35;
    this.cakeGroup.add(this.cakeKnifeGroup);

    // 3D Golden Sparkle Burst Particles above cake when sliced
    const sparkleCount = 36;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    for (let s = 0; s < sparkleCount; s++) {
      const ang = (s / sparkleCount) * Math.PI * 2;
      const r = 0.25 + (s % 5) * 0.14;
      sparklePos[s * 3] = Math.cos(ang) * r;
      sparklePos[s * 3 + 1] = 0.85 + (s % 4) * 0.18;
      sparklePos[s * 3 + 2] = Math.sin(ang) * r;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
    this.cakeSparkles = new THREE.Points(
      sparkleGeo,
      new THREE.PointsMaterial({
        color: 0xffdf79,
        size: 0.09,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.cakeSparkles.visible = false;
    this.cakeGroup.add(this.cakeSparkles);

    this.interactiveObjects.push({
      type: 'cake',
      mesh: topTier,
      prompt: 'Click or press [E] to Blow Candles & Cut Birthday Cake!',
    });

    this.scene.add(this.cakeGroup);
  }

  private buildPhotoFrames() {
    // 4 High-Res Memory Photos attached to room walls with warm picture frames
    const frameGeo = new THREE.BoxGeometry(2.1, 2.7, 0.1);
    const frameBorderMat = new THREE.MeshStandardMaterial({
      color: 0x24150c,
      roughness: 0.4,
      metalness: 0.2,
    });

    const photoConfigs = [
      {
        id: 'memory-1',
        url: '/assets/aistudio/memory_1.jpg',
        pos: [-5.6, 3.4, -1.8] as [number, number, number],
        rotY: Math.PI / 2, // Left Wall
        spotTarget: [-5.6, 3.4, -1.8],
      },
      {
        id: 'memory-2',
        url: '/assets/aistudio/memory_2.jpg',
        pos: [-5.6, 3.4, -7.2] as [number, number, number],
        rotY: Math.PI / 2, // Left Wall further back
        spotTarget: [-5.6, 3.4, -7.2],
      },
      {
        id: 'memory-3',
        url: '/assets/aistudio/memory_3.jpg',
        pos: [-2.6, 3.4, -10.5] as [number, number, number],
        rotY: 0, // Back Wall Left
        spotTarget: [-2.6, 3.4, -10.5],
      },
      {
        id: 'memory-4',
        url: '/assets/aistudio/memory_4.jpg',
        pos: [2.6, 3.4, -10.5] as [number, number, number],
        rotY: 0, // Back Wall Right
        spotTarget: [2.6, 3.4, -10.5],
      },
    ];

    photoConfigs.forEach(cfg => {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(...cfg.pos);
      frameGroup.rotation.y = cfg.rotY;

      // Wooden Frame Border
      const frameMesh = new THREE.Mesh(frameGeo, frameBorderMat);
      frameGroup.add(frameMesh);

      // Picture Plane
      const photoGeo = new THREE.PlaneGeometry(1.8, 2.4);
      const photoMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
      });

      this.textureLoader.load(cfg.url, tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        photoMat.map = tex;
        photoMat.needsUpdate = true;
      });

      const photoMesh = new THREE.Mesh(photoGeo, photoMat);
      photoMesh.position.z = 0.06;
      frameGroup.add(photoMesh);
      this.photoMeshes.push(photoMesh);

      // Warm Accent Picture Spotlight
      const spot = new THREE.SpotLight(0xfff0dd, 2.5, 6, Math.PI / 4, 0.4);
      spot.position.set(0, 1.2, 1.2);
      spot.target = photoMesh;
      frameGroup.add(spot);
      frameGroup.add(spot.target);

      this.interactiveObjects.push({
        type: 'photo',
        id: cfg.id,
        mesh: photoMesh,
        prompt: 'Click to Inspect Photo Memory',
      });

      this.scene.add(frameGroup);
    });
  }

  private buildVirtualTV() {
    const tvGroup = new THREE.Group();

    // 1. Designer Walnut Media Console Table with Brass Trim
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x2c1d11, roughness: 0.55 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });

    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.85, 0.95), consoleMat);
    tvStand.position.set(5.3, 1.35, -4.5);
    tvStand.rotation.y = -Math.PI / 2;
    tvStand.castShadow = true;
    tvStand.receiveShadow = true;
    tvGroup.add(tvStand);

    const brassTrim = new THREE.Mesh(new THREE.BoxGeometry(3.84, 0.06, 0.98), brassMat);
    brassTrim.position.set(5.3, 1.78, -4.5);
    brassTrim.rotation.y = -Math.PI / 2;
    tvGroup.add(brassTrim);

    // Sleek Acoustic Soundbar below TV
    const soundbar = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.12, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.3, metalness: 0.7 })
    );
    soundbar.position.set(5.25, 1.88, -4.5);
    soundbar.rotation.y = -Math.PI / 2;
    tvGroup.add(soundbar);

    // 2. Aesthetic "Frame TV" Outer Bezel & Inner Matte Gallery Border
    const tvOuterBezel = new THREE.Mesh(
      new THREE.BoxGeometry(3.45, 2.15, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x3b2313, roughness: 0.35, metalness: 0.4 })
    );
    tvOuterBezel.position.set(5.52, 2.95, -4.5);
    tvOuterBezel.rotation.y = -Math.PI / 2;
    tvGroup.add(tvOuterBezel);

    const tvGoldInnerRim = new THREE.Mesh(
      new THREE.BoxGeometry(3.32, 2.02, 0.12),
      brassMat
    );
    tvGoldInnerRim.position.set(5.5, 2.95, -4.5);
    tvGoldInnerRim.rotation.y = -Math.PI / 2;
    tvGroup.add(tvGoldInnerRim);

    // 3. Video Element (Transcoded H.264 yuv420p for 100% browser compatibility + low volume)
    this.tvVideoElement = document.createElement('video');
    this.tvVideoElement.src = '/assets/aistudio/sanchary_tv_h264.mp4';
    this.tvVideoElement.loop = true;
    this.tvVideoElement.volume = 0.14; // Low, gentle volume as requested
    this.tvVideoElement.muted = true; // Starts muted for autoplay policy; unmuted on user start
    this.tvVideoElement.playsInline = true;
    this.tvVideoElement.setAttribute('playsinline', 'true');
    this.tvVideoElement.setAttribute('webkit-playsinline', 'true');
    this.tvVideoElement.preload = 'auto';
    this.tvVideoElement.load();
    this.tvVideoElement.play().catch(() => {
      // Will start on first user gesture
    });

    // 4. Aesthetic Widescreen Compositor Canvas + Direct Hardware VideoTexture
    this.tvCanvas = document.createElement('canvas');
    this.tvCanvas.width = 960;
    this.tvCanvas.height = 540;
    this.tvCtx = this.tvCanvas.getContext('2d');

    this.tvCanvasTexture = new THREE.CanvasTexture(this.tvCanvas);
    this.tvCanvasTexture.colorSpace = THREE.SRGBColorSpace;
    this.tvCanvasTexture.minFilter = THREE.LinearFilter;
    this.tvCanvasTexture.magFilter = THREE.LinearFilter;

    const screenGeo = new THREE.PlaneGeometry(3.2, 1.88);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.tvCanvasTexture,
    });

    this.tvVideoMesh = new THREE.Mesh(screenGeo, screenMat);
    this.tvVideoMesh.position.set(5.43, 2.95, -4.5);
    this.tvVideoMesh.rotation.y = -Math.PI / 2;
    tvGroup.add(this.tvVideoMesh);

    // Direct Hardware-Accelerated VideoTexture Plane (9:16 Portrait Frame mounted on the TV)
    this.tvDirectVideoTexture = new THREE.VideoTexture(this.tvVideoElement);
    this.tvDirectVideoTexture.colorSpace = THREE.SRGBColorSpace;
    this.tvDirectVideoTexture.minFilter = THREE.LinearFilter;
    this.tvDirectVideoTexture.magFilter = THREE.LinearFilter;

    const portraitFrameRim = new THREE.Mesh(
      new THREE.PlaneGeometry(1.04, 1.78),
      new THREE.MeshBasicMaterial({ color: 0xe2b877 })
    );
    portraitFrameRim.position.set(5.415, 2.95, -4.12);
    portraitFrameRim.rotation.y = -Math.PI / 2;
    tvGroup.add(portraitFrameRim);

    const directVideoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 1.72),
      new THREE.MeshBasicMaterial({ map: this.tvDirectVideoTexture })
    );
    directVideoPlane.position.set(5.405, 2.95, -4.12);
    directVideoPlane.rotation.y = -Math.PI / 2;
    tvGroup.add(directVideoPlane);

    // 5. Warm Ambilight Backlight & Living Area Screen Glow
    const tvLight = new THREE.PointLight(0xffd299, 1.45, 8, 1.8);
    tvLight.position.set(4.8, 2.95, -4.5);
    tvGroup.add(tvLight);

    this.scene.add(tvGroup);

    this.interactiveObjects.push({
      type: 'tv',
      mesh: this.tvVideoMesh,
      prompt: 'Click to Open Aesthetic TV View / Adjust Volume',
    });
    this.interactiveObjects.push({
      type: 'tv',
      mesh: directVideoPlane,
      prompt: 'Click to Open Aesthetic TV View / Adjust Volume',
    });
  }

  private buildParents() {
    // 3D Mom and Dad character figures with party hats cheering!
    const parentsGroup = new THREE.Group();
    parentsGroup.position.set(0, 0.8, -5.2); // Standing behind the birthday cake table

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const hairDarkMat = new THREE.MeshStandardMaterial({ color: 0x221811, roughness: 0.8 });
    const hairSilverMat = new THREE.MeshStandardMaterial({ color: 0x4a4746, roughness: 0.8 });
    const momDressMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2, roughness: 0.6 }); // Elegant purple sari/dress
    const dadSuitMat = new THREE.MeshStandardMaterial({ color: 0x1f3b4d, roughness: 0.7 }); // Navy blazer
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.4 }); // Golden party hat

    // --- DAD (on the left) ---
    this.dadModel = new THREE.Group();
    this.dadModel.position.set(-1.0, 0, 0);

    // Body/Torso
    const dadTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.35, 1.4, 12), dadSuitMat);
    dadTorso.position.y = 1.7;
    dadTorso.castShadow = true;
    this.dadModel.add(dadTorso);

    // Head
    const dadHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
    dadHead.position.y = 2.65;
    dadHead.castShadow = true;
    this.dadModel.add(dadHead);

    // Hair
    const dadHair = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairSilverMat);
    dadHair.position.y = 2.72;
    this.dadModel.add(dadHair);

    // Dad Party Hat
    const dadHat = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 12), hatMat);
    dadHat.position.set(0, 3.05, 0);
    this.dadModel.add(dadHat);

    // Cheering Arms (raised in celebration)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.85, 8);
    const dadArmL = new THREE.Mesh(armGeo, dadSuitMat);
    dadArmL.position.set(-0.48, 2.1, 0.2);
    dadArmL.rotation.z = 0.75;
    dadArmL.rotation.x = -0.4;
    this.dadModel.add(dadArmL);

    const dadArmR = new THREE.Mesh(armGeo, dadSuitMat);
    dadArmR.position.set(0.48, 2.1, 0.2);
    dadArmR.rotation.z = -0.75;
    dadArmR.rotation.x = -0.4;
    this.dadModel.add(dadArmR);

    parentsGroup.add(this.dadModel);

    // --- MOM (on the right) ---
    this.momModel = new THREE.Group();
    this.momModel.position.set(1.0, 0, 0);

    // Body/Torso
    const momTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.35, 12), momDressMat);
    momTorso.position.y = 1.65;
    momTorso.castShadow = true;
    this.momModel.add(momTorso);

    // Head
    const momHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
    momHead.position.y = 2.55;
    momHead.castShadow = true;
    this.momModel.add(momHead);

    // Hair bun
    const momHair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), hairDarkMat);
    momHair.position.set(0, 2.62, -0.06);
    this.momModel.add(momHair);

    // Mom Party Hat
    const momHatMat = new THREE.MeshStandardMaterial({ color: 0xff6b8b, roughness: 0.4 });
    const momHat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 12), momHatMat);
    momHat.position.set(0, 2.95, 0);
    this.momModel.add(momHat);

    // Cheering Arms
    const momArmL = new THREE.Mesh(armGeo, momDressMat);
    momArmL.position.set(-0.44, 2.0, 0.2);
    momArmL.rotation.z = 0.65;
    momArmL.rotation.x = -0.3;
    this.momModel.add(momArmL);

    const momArmR = new THREE.Mesh(armGeo, momDressMat);
    momArmR.position.set(0.44, 2.0, 0.2);
    momArmR.rotation.z = -0.65;
    momArmR.rotation.x = -0.3;
    this.momModel.add(momArmR);

    parentsGroup.add(this.momModel);

    // Interaction target
    this.interactiveObjects.push({
      type: 'parents',
      mesh: dadTorso,
      prompt: 'Talk to Mom & Dad (Hear their Birthday Blessing)',
    });
    this.interactiveObjects.push({
      type: 'parents',
      mesh: momTorso,
      prompt: 'Talk to Mom & Dad (Hear their Birthday Blessing)',
    });

    this.scene.add(parentsGroup);
  }

  private buildTreasureChests() {
    INITIAL_CHESTS.forEach(chestData => {
      const chestGroup = new THREE.Group();
      chestGroup.position.set(...chestData.position);

      // Chest Body (Rich mahogany wood + golden trim)
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x4e2710, roughness: 0.65 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xe6b800, metalness: 0.85, roughness: 0.25 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.6), woodMat);
      base.position.y = 0.225;
      base.castShadow = true;
      chestGroup.add(base);

      // Golden Edge Brackets
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.47, 0.1), goldMat);
      trim.position.set(0, 0.225, 0);
      chestGroup.add(trim);

      // Chest Lid (can pivot open)
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.45, -0.3); // hinge at back

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.85, 12, 1, false, 0, Math.PI), woodMat);
      lid.rotation.z = Math.PI / 2;
      lid.position.set(0, 0, 0.3);
      lid.castShadow = true;
      lidPivot.add(lid);

      const goldLock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), goldMat);
      goldLock.position.set(0, 0.04, 0.61);
      lidPivot.add(goldLock);

      chestGroup.add(lidPivot);
      chestGroup.name = `chest_${chestData.id}`;

      // Floating Sparkle Glow beacon over unopened chest
      const beaconGeo = new THREE.OctahedronGeometry(0.16);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 1.1, 0);
      beacon.name = 'beacon';
      chestGroup.add(beacon);

      this.chestGroups.set(chestData.id, chestGroup);

      this.interactiveObjects.push({
        type: 'chest',
        id: chestData.id,
        data: chestData,
        mesh: base,
        prompt: `Click to Open ${chestData.name}`,
      });

      this.scene.add(chestGroup);
    });
  }

  public openChestVisual(id: string) {
    const group = this.chestGroups.get(id);
    if (!group) return;

    // Remove glowing beacon
    const beacon = group.getObjectByName('beacon');
    if (beacon) group.remove(beacon);

    // Rotate lid
    group.children.forEach(child => {
      if (child instanceof THREE.Group) {
        child.rotation.x = -Math.PI * 0.45; // open lid
      }
    });
  }

  public setDoorOpen(open: boolean) {
    this.isDoorOpen = open;
    if (this.doorPivot) {
      this.doorPivot.rotation.y = open ? -Math.PI * 0.65 : 0;
    }
  }

  public extinguishCandles() {
    this.candleFlames.forEach(f => (f.visible = false));
    this.candleLights.forEach(l => (l.intensity = 0));
  }

  public dimRoomLights() {
    this.setRoomAmbientLevel(0.35);
  }

  public setRoomAmbientLevel(level: number) {
    this.targetRoomAmbientLevel = Math.max(0.2, Math.min(1.0, level));
    if (this.fairyLightsMaterial) {
      this.fairyLightsMaterial.color.setHex(this.targetRoomAmbientLevel < 0.6 ? 0xffaa44 : 0xffe099);
    }
  }

  public setCakeSlicingProgress(normalizedProgress: number) {
    if (!this.cakeKnifeGroup) return;
    const p = Math.max(0, Math.min(1, normalizedProgress));
    // Hover knife over top tier and saw gently downward along the wedge seam
    const cutAngle = p < 0.5 ? 0.35 : 0.78;
    const localProgress = p < 0.5 ? p * 2 : (p - 0.5) * 2;
    this.cakeKnifeGroup.position.set(
      Math.cos(cutAngle) * (0.12 + localProgress * 0.42),
      0.98 - localProgress * 0.22,
      Math.sin(cutAngle) * (0.12 + localProgress * 0.42)
    );
    this.cakeKnifeGroup.rotation.set(0.32, -cutAngle, 0);
    if (this.cakeSparkles && p > 0.05) {
      this.cakeSparkles.visible = true;
    }
  }

  public cutCakeVisual() {
    this.isCakeCutCompleted = true;
    if (this.cakeSliceGroup) {
      this.cakeSliceGroup.visible = true;
      this.cakeSliceGroup.position.set(0.38, -0.02, 0.28);
    }
    if (this.cakeKnifeGroup) {
      this.cakeKnifeGroup.position.set(1.08, 0.08, -0.25);
      this.cakeKnifeGroup.rotation.set(0, -0.45, 0);
    }
    if (this.cakeSparkles) {
      this.cakeSparkles.visible = true;
    }
  }

  public update(delta: number, elapsed: number) {
    // 0. Animate 3D cake wedge sliding out & golden sparkle burst when cut
    if (this.isCakeCutCompleted && this.cakeSliceGroup) {
      this.cakeCutAnimProgress = Math.min(1, this.cakeCutAnimProgress + delta * 1.8);
      const ease = 1 - Math.pow(1 - this.cakeCutAnimProgress, 3);
      this.cakeSliceGroup.position.set(0.18 + ease * 0.38, -ease * 0.04, 0.12 + ease * 0.24);
    }
    if (this.cakeSparkles && this.cakeSparkles.visible) {
      this.cakeSparkles.rotation.y += delta * 1.4;
      this.cakeSparkles.position.y = Math.sin(elapsed * 3.5) * 0.06;
    }

    // 1. Smoothly damp room ambient lighting state & compute reactive fireplace flicker
    const ambientDamp = 1 - Math.exp(-delta * 3.5);
    this.roomAmbientLevel += (this.targetRoomAmbientLevel - this.roomAmbientLevel) * ambientDamp;
    this.indoorRoomLights.forEach(({ light, baseIntensity }) => {
      light.intensity = baseIntensity * this.roomAmbientLevel;
    });

    const flicker = computeFireplaceFlickerState(elapsed, this.roomAmbientLevel);
    if (this.fireplaceLight) {
      this.fireplaceLight.intensity = flicker.primaryIntensity;
      this.fireplaceLight.distance = flicker.lightRange;
      this.fireplaceLight.color.setRGB(flicker.colorR, flicker.colorG, flicker.colorB);
      this.fireplaceLight.position.set(
        -3.85 + flicker.offsetX,
        1.45 + flicker.offsetY,
        -4.5 + flicker.offsetZ
      );
    }
    if (this.fireplaceBounceLight) {
      this.fireplaceBounceLight.intensity = flicker.bounceIntensity;
      this.fireplaceBounceLight.color.setRGB(
        1.0,
        Math.min(0.75, flicker.colorG + 0.08),
        Math.min(0.32, flicker.colorB + 0.05)
      );
    }
    if (this.fireplaceEmberMaterial) {
      this.fireplaceEmberMaterial.emissiveIntensity = 0.85 + flicker.emberGlow * 1.35;
    }

    this.fireplaceFlames.forEach((flame, i) => {
      const boost = 0.85 + flicker.emberGlow * 0.45;
      flame.scale.y = boost + Math.sin(elapsed * 13.0 + i * 1.4) * 0.25;
      flame.scale.x = 0.9 + Math.cos(elapsed * 10.5 + i * 1.1) * 0.16;
      flame.rotation.z = Math.sin(elapsed * 8.2 + i) * 0.08;
    });

    // 2. Candle flame dancing
    this.candleFlames.forEach((flame, i) => {
      if (flame.visible) {
        flame.scale.y = 0.9 + Math.sin(elapsed * 20.0 + i * 2) * 0.25;
        flame.rotation.z = Math.sin(elapsed * 12.0 + i) * 0.15;
      }
    });

    // 3. Balloons gentle floating bobbing
    if (this.balloonGroup) {
      this.balloonGroup.children.forEach((child, idx) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
          child.position.y += Math.sin(elapsed * 1.5 + idx) * 0.0015;
          child.rotation.z = Math.sin(elapsed * 1.2 + idx) * 0.04;
        }
      });
    }

    // 4. Chimney smoke drift
    if (this.chimneySmoke) {
      const pos = this.chimneySmoke.geometry.attributes.position as THREE.BufferAttribute;
      const array = pos.array as Float32Array;
      for (let i = 0; i < this.smokeCount; i++) {
        const i3 = i * 3;
        array[i3 + 1] += delta * 1.8; // rise
        array[i3] += delta * 0.4 + Math.sin(elapsed + i) * 0.01; // drift with wind

        if (array[i3 + 1] > 16.0) {
          array[i3 + 1] = 9.5;
          array[i3] = -4.5 + (Math.random() - 0.5) * 0.3;
          array[i3 + 2] = -4.5 + (Math.random() - 0.5) * 0.3;
        }
      }
      pos.needsUpdate = true;
    }

    // 5. Unopened chest beacon bobbing & rotating
    this.chestGroups.forEach(group => {
      const beacon = group.getObjectByName('beacon');
      if (beacon) {
        beacon.position.y = 1.1 + Math.sin(elapsed * 3.0) * 0.12;
        beacon.rotation.y += delta * 2.5;
      }
    });

    // 6. Parents cheering idle animation
    if (this.dadModel && this.momModel) {
      this.dadModel.position.y = Math.sin(elapsed * 4.0) * 0.04;
      this.momModel.position.y = Math.sin(elapsed * 4.0 + 1.2) * 0.04;
    }

    // 7. Gentle starlight shimmer in the night sky
    if (this.starMaterial) {
      this.starMaterial.opacity = 0.82 + Math.sin(elapsed * 2.2) * 0.14;
    }

    // 8. Render aesthetic Frame TV canvas & update direct VideoTexture
    this.renderTvCanvas(elapsed);
    if (this.tvDirectVideoTexture && this.tvVideoElement && this.tvVideoElement.readyState >= 2) {
      this.tvDirectVideoTexture.needsUpdate = true;
    }
  }

  private renderTvCanvas(elapsed: number) {
    if (!this.tvCtx || !this.tvCanvas || !this.tvCanvasTexture) return;
    const ctx = this.tvCtx;
    const w = this.tvCanvas.width;
    const h = this.tvCanvas.height;

    // Warm dark ambient gallery background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#16110e');
    grad.addColorStop(0.5, '#241a14');
    grad.addColorStop(1, '#120f16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const vid = this.tvVideoElement;
    if (vid && vid.readyState >= 2) {
      // Draw soft darkened ambient background echo across the screen
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.drawImage(vid, 0, -h * 0.3, w, h * 1.6);
      ctx.restore();
    }

    // Dark vignette scrim
    const vignette = ctx.createRadialGradient(w * 0.58, h * 0.5, 90, w * 0.5, h * 0.5, w * 0.65);
    vignette.addColorStop(0, 'rgba(18, 13, 10, 0.2)');
    vignette.addColorStop(1, 'rgba(12, 9, 8, 0.9)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // Aesthetic Left-Side Gallery Typography & Audio Wave Indicator
    ctx.fillStyle = '#e2b877';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('LIVING ROOM CINEMA · CHALET TV', 48, 150);

    ctx.fillStyle = '#fdf4e7';
    ctx.font = 'bold 40px "Cormorant Garamond", serif';
    ctx.fillText("Sanchary's", 48, 205);
    ctx.fillText('Golden Moments', 48, 250);

    ctx.fillStyle = 'rgba(253, 244, 231, 0.72)';
    ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Acoustic guitar memory reel', 48, 292);
    ctx.fillText('playing softly in the background', 48, 316);

    // Subtle animated acoustic equalizer bars
    const isPlayingAudio = vid && !vid.paused && !vid.muted;
    for (let i = 0; i < 12; i++) {
      const barH = isPlayingAudio
        ? 8 + Math.abs(Math.sin(elapsed * 5.5 + i * 0.7)) * 22
        : 6;
      ctx.fillStyle = isPlayingAudio ? '#f59e0b' : 'rgba(226, 184, 119, 0.35)';
      ctx.fillRect(48 + i * 12, 375 - barH, 6, barH);
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      isPlayingAudio
        ? ` Ambient Volume: ${Math.round((vid?.volume ?? 0.14) * 100)}% (Low & Cozy)`
        : ' Tap TV to adjust volume / view up close',
      48,
      405
    );

    // Subtle outer gallery border
    ctx.strokeStyle = 'rgba(226, 184, 119, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    this.tvCanvasTexture.needsUpdate = true;
  }

  public hasUserInteracted: boolean = false;

  public syncTvAmbientVolume(isInsideHouse: boolean, isGlobalMuted: boolean, customVolume: number = 0.14) {
    if (!this.tvVideoElement) return;
    if (isGlobalMuted || !this.hasUserInteracted) {
      this.tvVideoElement.muted = true;
    } else {
      this.tvVideoElement.muted = false;
      // Soft low volume indoors, whisper-quiet when outside on the snowy trail
      const targetVol = isInsideHouse ? customVolume : Math.min(0.04, customVolume * 0.3);
      this.tvVideoElement.volume = Math.max(0, Math.min(1, targetVol));
    }
    if (this.tvVideoElement.paused) {
      this.tvVideoElement.play().catch(() => {});
    }
  }

  public dispose() {
    if (this.tvVideoElement) {
      this.tvVideoElement.pause();
      this.tvVideoElement.src = '';
    }
    if (this.tvDirectVideoTexture) {
      this.tvDirectVideoTexture.dispose();
    }
    if (this.tvCanvasTexture) {
      this.tvCanvasTexture.dispose();
    }
  }
}
