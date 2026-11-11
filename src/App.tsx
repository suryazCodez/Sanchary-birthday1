/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundEngine } from './audio/SoundEngine';
import { ProceduralWorld, InteractiveObjectRef } from './scene/ProceduralWorld';
import { SnowfallSystem, SnowPreset } from './scene/SnowfallSystem';
import { PlayerController } from './scene/PlayerController';
import { GameQuestState, TreasureChest, INITIAL_CHESTS } from './types/game';
import { PrologueLoading } from './components/PrologueLoading';
import { HUDControls } from './components/HUDControls';
import { NoteModal } from './components/NoteModal';
import { PhotoGalleryModal } from './components/PhotoGalleryModal';
import { CakeCuttingModal } from './components/CakeCuttingModal';
import { FamilyGreetingModal } from './components/FamilyGreetingModal';
import { VercelDeployGuide } from './components/VercelDeployGuide';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Experience state
  const [hasStarted, setHasStarted] = useState(false);
  const [questState, setQuestState] = useState<GameQuestState>({
    hasWalked: false,
    chestsFound: 0,
    totalChests: 3,
    doorUnlocked: false,
    enteredHouse: false,
    candlesBlown: false,
    cakeCut: false,
    parentsGreeted: false,
    tvWatched: false,
    allPhotosViewed: false,
  });

  // Weather & Atmosphere state
  const [snowPreset, setSnowPreset] = useState<SnowPreset>('cozy');
  const [windIntensity, setWindIntensity] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals state
  const [activeChest, setActiveChest] = useState<TreasureChest | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [showCakeModal, setShowCakeModal] = useState(false);
  const [showParentsModal, setShowParentsModal] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [interactivePrompt, setInteractivePrompt] = useState<string | null>(null);

  // Refs for animation loop access without closures
  const worldRef = useRef<ProceduralWorld | null>(null);
  const snowfallRef = useRef<SnowfallSystem | null>(null);
  const controllerRef = useRef<PlayerController | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isWalkingButtonRef = useRef(false);
  const chestsStateRef = useRef<TreasureChest[]>(INITIAL_CHESTS);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 250);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Build World & Systems
    const world = new ProceduralWorld(scene);
    world.buildWorld();
    worldRef.current = world;

    const snowfall = new SnowfallSystem();
    scene.add(snowfall.points);
    snowfallRef.current = snowfall;

    const controller = new PlayerController(camera);
    controllerRef.current = controller;

    // Raycaster for click interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      soundEngine.init();
      // Ignore if clicking on UI overlay
      if ((event.target as HTMLElement).closest('.z-40') || (event.target as HTMLElement).closest('.z-50')) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check raycast against all interactive meshes
      const interactiveTargets = world.interactiveObjects.map(io => io.mesh);
      const intersects = raycaster.intersectObjects(interactiveTargets, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        let matchedRef: InteractiveObjectRef | undefined;

        for (const io of world.interactiveObjects) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr) {
            if (curr === io.mesh) {
              matchedRef = io;
              break;
            }
            curr = curr.parent;
          }
          if (matchedRef) break;
        }

        if (matchedRef) {
          executeInteraction(matchedRef);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Keyboard interact key [E]
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && controller.nearbyInteractive) {
        executeInteraction(controller.nearbyInteractive);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Sync button walking state
      controller.buttonWalkForward = isWalkingButtonRef.current;

      // Update player
      controller.update(delta, elapsed, world.isDoorOpen, world.interactiveObjects);

      // Update interactive prompt based on proximity
      if (controller.nearbyInteractive) {
        setInteractivePrompt(controller.nearbyInteractive.prompt);
      } else {
        setInteractivePrompt(null);
      }

      // Check entered house state
      if (controller.isInsideHouse) {
        setQuestState(prev => prev.enteredHouse ? prev : { ...prev, enteredHouse: true });
      }

      // Update snowfall and world
      snowfall.update(delta, elapsed, controller.position);
      world.update(delta, elapsed);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);

      world.dispose();
      snowfall.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Interaction dispatcher
  const executeInteraction = useCallback((target: InteractiveObjectRef) => {
    soundEngine.init();

    switch (target.type) {
      case 'door': {
        const world = worldRef.current;
        if (!world) return;
        const newDoorState = !world.isDoorOpen;
        world.setDoorOpen(newDoorState);
        soundEngine.playDoorCreak();
        setQuestState(prev => ({ ...prev, doorUnlocked: true }));
        break;
      }
      case 'chest': {
        const world = worldRef.current;
        if (!world || !target.data) return;
        const chest = target.data as TreasureChest;
        world.openChestVisual(chest.id);
        soundEngine.playChestOpen();
        setActiveChest(chest);

        setQuestState(prev => {
          const already = chestsStateRef.current.find(c => c.id === chest.id)?.opened;
          if (!already) {
            chestsStateRef.current = chestsStateRef.current.map(c =>
              c.id === chest.id ? { ...c, opened: true } : c
            );
            return { ...prev, chestsFound: prev.chestsFound + 1 };
          }
          return prev;
        });
        break;
      }
      case 'cake': {
        setShowCakeModal(true);
        break;
      }
      case 'photo': {
        if (target.id) {
          setActivePhotoId(target.id);
        }
        break;
      }
      case 'tv': {
        const world = worldRef.current;
        if (world && world.tvVideoElement) {
          if (world.tvVideoElement.paused) {
            world.tvVideoElement.play();
            world.tvVideoElement.muted = false;
          } else {
            world.tvVideoElement.muted = !world.tvVideoElement.muted;
          }
        }
        break;
      }
      case 'parents': {
        setShowParentsModal(true);
        break;
      }
    }
  }, []);

  // Weather handlers
  const handleSetSnowPreset = (preset: SnowPreset) => {
    setSnowPreset(preset);
    if (snowfallRef.current) {
      snowfallRef.current.setPreset(preset);
    }
  };

  const handleSetWindIntensity = (val: number) => {
    setWindIntensity(val);
    soundEngine.setWindIntensity(val);
    if (snowfallRef.current) {
      snowfallRef.current.setIntensity(val);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handlePlayBirthdayMelody = () => {
    soundEngine.init();
    soundEngine.playBirthdayMelody();
  };

  // Walking button handlers
  const handleWalkButtonDown = () => {
    soundEngine.init();
    isWalkingButtonRef.current = true;
  };

  const handleWalkButtonUp = () => {
    isWalkingButtonRef.current = false;
  };

  // Teleport Waypoints
  const handleTeleportPreset = (preset: 'trail' | 'porch' | 'cake' | 'tv' | 'gallery') => {
    const ctrl = controllerRef.current;
    const world = worldRef.current;
    if (!ctrl) return;

    switch (preset) {
      case 'trail':
        ctrl.teleport([0, 1.8, 20.0], [0, 2.2, 4.0]);
        break;
      case 'porch':
        ctrl.teleport([0, 2.0, 7.5], [0, 2.2, 3.0]);
        break;
      case 'cake':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([0, 2.5, 0.4], [0, 2.2, -3.2]);
        break;
      case 'tv':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([1.5, 2.2, -4.5], [5.4, 2.6, -4.5]);
        break;
      case 'gallery':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([0, 2.4, -6.0], [-5.6, 3.4, -7.0]);
        break;
    }
  };

  // Candle extinguish handler
  const handleExtinguishCandles = () => {
    const world = worldRef.current;
    if (world) {
      world.extinguishCandles();
      world.dimRoomLights();
    }
    setQuestState(prev => ({ ...prev, candlesBlown: true }));
  };

  // Cake cut handler
  const handleCutCake = () => {
    const world = worldRef.current;
    if (world) {
      world.cutCakeVisual();
    }
    setQuestState(prev => ({ ...prev, cakeCut: true }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 touch-none" />

      {/* Prologue Loading / Intro */}
      {!hasStarted && (
        <PrologueLoading onStart={() => setHasStarted(true)} />
      )}

      {/* Main HUD Controls & Dock */}
      {hasStarted && (
        <HUDControls
          questState={questState}
          snowPreset={snowPreset}
          onSetSnowPreset={handleSetSnowPreset}
          windIntensity={windIntensity}
          onSetWindIntensity={handleSetWindIntensity}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPlayBirthdayMelody={handlePlayBirthdayMelody}
          onWalkButtonDown={handleWalkButtonDown}
          onWalkButtonUp={handleWalkButtonUp}
          onTeleportPreset={handleTeleportPreset}
          interactivePrompt={interactivePrompt}
          onTriggerInteract={() => {
            if (controllerRef.current?.nearbyInteractive) {
              executeInteraction(controllerRef.current.nearbyInteractive);
            }
          }}
          onOpenVercelGuide={() => setShowVercelGuide(true)}
        />
      )}

      {/* Treasure Chest Heartfelt Note Modal */}
      {activeChest && (
        <NoteModal chest={activeChest} onClose={() => setActiveChest(null)} />
      )}

      {/* Memory Photo Gallery Modal */}
      {activePhotoId && (
        <PhotoGalleryModal
          initialPhotoId={activePhotoId}
          onClose={() => setActivePhotoId(null)}
        />
      )}

      {/* Candle Blowing & Cake Cutting Modal */}
      {showCakeModal && (
        <CakeCuttingModal
          candlesBlown={questState.candlesBlown}
          cakeCut={questState.cakeCut}
          onExtinguishCandles={handleExtinguishCandles}
          onCutCake={handleCutCake}
          onClose={() => setShowCakeModal(false)}
        />
      )}

      {/* Mom & Dad Birthday Blessing Modal */}
      {showParentsModal && (
        <FamilyGreetingModal onClose={() => setShowParentsModal(false)} />
      )}

      {/* Vercel Deployment Guide Modal */}
      {showVercelGuide && (
        <VercelDeployGuide onClose={() => setShowVercelGuide(false)} />
      )}
    </div>
  );
}
