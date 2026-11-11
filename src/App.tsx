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
import { VirtualTVModal } from './components/VirtualTVModal';
import { LandscapeOrientationGuard } from './components/LandscapeOrientationGuard';
import { computeLandscapeCameraFov } from './utils/fireplaceLighting';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // Experience state (supports ?autostart=1)
  const [hasStarted, setHasStarted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('autostart') === '1';
    }
    return false;
  });
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
  const [isRoomDimmed, setIsRoomDimmed] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [tvVolume, setTvVolume] = useState<number>(0.14); // Low & cozy default volume (14%)

  // Modals state
  const [activeChest, setActiveChest] = useState<TreasureChest | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [showCakeModal, setShowCakeModal] = useState(false);
  const [showParentsModal, setShowParentsModal] = useState(false);
  const [showVercelGuide, setShowVercelGuide] = useState(false);
  const [showTvModal, setShowTvModal] = useState(false);
  const [interactivePrompt, setInteractivePrompt] = useState<string | null>(null);

  // Refs for animation loop access without closures
  const worldRef = useRef<ProceduralWorld | null>(null);
  const snowfallRef = useRef<SnowfallSystem | null>(null);
  const controllerRef = useRef<PlayerController | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const isWalkingButtonRef = useRef(false);
  const isMutedRef = useRef(false);
  const tvVolumeRef = useRef(0.14);
  const chestsStateRef = useRef<TreasureChest[]>(INITIAL_CHESTS);

  // Interaction dispatcher
  const executeInteraction = useCallback((target: InteractiveObjectRef) => {
    soundEngine.init();
    if (worldRef.current) {
      worldRef.current.hasUserInteracted = true;
    }

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
          world.tvVideoElement.play().catch(() => {});
          world.syncTvAmbientVolume(true, isMutedRef.current, tvVolumeRef.current);
          setQuestState(prev => ({ ...prev, tvWatched: true }));
        }
        setShowTvModal(true);
        break;
      }
      case 'parents': {
        setShowParentsModal(true);
        setQuestState(prev => ({ ...prev, parentsGreeted: true }));
        break;
      }
    }
  }, []);

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

    // Scene & Camera (with adaptive FOV calibrated to landscape aspect ratio)
    const scene = new THREE.Scene();
    const initialFov = computeLandscapeCameraFov(width, height);
    const camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 250);

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

    // Raycaster & Touch-Drag Look State
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lookPointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let dragDistance = 0;

    const handlePointerDown = (event: PointerEvent) => {
      soundEngine.init();
      world.hasUserInteracted = true;
      // Ensure TV video plays with soft low volume on user interaction
      if (world.tvVideoElement) {
        if (world.tvVideoElement.paused) {
          world.tvVideoElement.play().catch(() => {});
        }
        world.syncTvAmbientVolume(controller.isInsideHouse, isMutedRef.current, tvVolumeRef.current);
      }

      if ((event.target as HTMLElement).closest('.z-40') || (event.target as HTMLElement).closest('.z-50')) {
        return;
      }

      lookPointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      dragDistance = 0;
      try {
        renderer.domElement.setPointerCapture(event.pointerId);
      } catch {
        // ignore if unsupported in headless synthetic event
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (lookPointerId !== event.pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      dragDistance += Math.hypot(dx, dy);

      if (dragDistance > 3) {
        // Dragging on screen rotates camera view smoothly
        controller.rotateCamera(-dx * 0.0055, -dy * 0.004);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (lookPointerId !== event.pointerId) return;
      try {
        renderer.domElement.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      lookPointerId = null;

      // Only trigger 3D raycast click if user tapped rather than dragged
      if (dragDistance < 10) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

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
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (lookPointerId === event.pointerId) {
        lookPointerId = null;
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel);

    // Keyboard interact key [E]
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && controller.nearbyInteractive) {
        executeInteraction(controller.nearbyInteractive);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Responsive Landscape Aspect Ratio & ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth || window.innerWidth);
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.fov = computeLandscapeCameraFov(w, h);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(container);

    // Animation Loop (with software-WebGL pacing so headless CPU rendering never starves UI events)
    let animationFrameId = 0;
    let pacingTimerId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    const scheduleNextFrame = () => {
      if (disposed) return;
      if (isSoftwareGl) {
        pacingTimerId = window.setTimeout(() => {
          if (!disposed) animationFrameId = requestAnimationFrame(tick);
        }, 32);
      } else {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Sync button walking state
      controller.buttonWalkForward = isWalkingButtonRef.current;

      // Update player
      controller.update(delta, elapsed, world.isDoorOpen, world.interactiveObjects);

      // Keep TV volume gently synced with indoor/outdoor position
      world.syncTvAmbientVolume(controller.isInsideHouse, isMutedRef.current, tvVolumeRef.current);

      if (controller.isWalking) {
        setQuestState(prev => (prev.hasWalked ? prev : { ...prev, hasWalked: true }));
      }

      // Update interactive prompt based on proximity
      if (controller.nearbyInteractive) {
        setInteractivePrompt(controller.nearbyInteractive.prompt);
      } else {
        setInteractivePrompt(null);
      }

      // Check entered house state
      if (controller.isInsideHouse) {
        setQuestState(prev => (prev.enteredHouse ? prev : { ...prev, enteredHouse: true }));
      }

      // Update snowfall and world
      snowfall.update(delta, elapsed, controller.position);
      world.update(delta, elapsed);

      renderer.render(scene, camera);
      scheduleNextFrame();
    };

    scheduleNextFrame();

    // Cleanup
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(pacingTimerId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);

      world.dispose();
      snowfall.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [executeInteraction]);

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
    isMutedRef.current = next;
    soundEngine.setMuted(next);
    if (worldRef.current && controllerRef.current) {
      worldRef.current.syncTvAmbientVolume(controllerRef.current.isInsideHouse, next, tvVolumeRef.current);
    }
  };

  const handleTvVolumeChange = (val: number) => {
    setTvVolume(val);
    tvVolumeRef.current = val;
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
      soundEngine.setMuted(false);
    }
    if (worldRef.current && controllerRef.current) {
      worldRef.current.syncTvAmbientVolume(controllerRef.current.isInsideHouse, false, val);
    }
  };

  const handlePlayBirthdayMelody = () => {
    soundEngine.init();
    soundEngine.playBirthdayMelody();
  };

  // Walking button & joystick handlers
  const handleWalkButtonDown = () => {
    soundEngine.init();
    isWalkingButtonRef.current = true;
  };

  const handleWalkButtonUp = () => {
    isWalkingButtonRef.current = false;
  };

  const handleJoystickMove = (x: number, y: number) => {
    soundEngine.init();
    if (controllerRef.current) {
      controllerRef.current.joystick = { x, y };
    }
  };

  const handleToggleRoomDim = () => {
    const nextDim = !isRoomDimmed;
    setIsRoomDimmed(nextDim);
    if (worldRef.current) {
      worldRef.current.setRoomAmbientLevel(nextDim ? 0.35 : 1.0);
    }
  };

  const handleOpenSurpriseNote = (chest: TreasureChest) => {
    soundEngine.init();
    if (worldRef.current) {
      worldRef.current.openChestVisual(chest.id);
    }
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
  };

  // Teleport Waypoints
  const handleTeleportPreset = (preset: 'trail' | 'porch' | 'cake' | 'hearth' | 'tv' | 'gallery') => {
    const ctrl = controllerRef.current;
    const world = worldRef.current;
    if (!ctrl) return;

    switch (preset) {
      case 'trail':
        ctrl.teleport([0, 1.85, 20.0], [0, 2.2, 4.0]);
        break;
      case 'porch':
        ctrl.teleport([0, 2.0, 7.5], [0, 2.2, 3.0]);
        break;
      case 'cake':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([0, 2.85, -0.35], [0, 2.95, -3.2]);
        break;
      case 'hearth':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([-1.1, 2.85, -4.5], [-4.2, 1.35, -4.5]);
        break;
      case 'tv':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([1.5, 2.85, -4.5], [5.43, 2.95, -4.5]);
        if (world && world.tvVideoElement) {
          world.hasUserInteracted = true;
          world.tvVideoElement.play().catch(() => {});
          world.syncTvAmbientVolume(true, isMutedRef.current, tvVolumeRef.current);
        }
        break;
      case 'gallery':
        if (world && !world.isDoorOpen) world.setDoorOpen(true);
        ctrl.teleport([0, 2.85, -6.0], [-5.6, 3.4, -7.0]);
        break;
    }

    if (world) {
      ctrl.updateNearestInteractive(world.interactiveObjects);
      setInteractivePrompt(ctrl.nearbyInteractive ? ctrl.nearbyInteractive.prompt : null);
    }
  };

  // Candle extinguish handler
  const handleExtinguishCandles = () => {
    const world = worldRef.current;
    if (world) {
      world.extinguishCandles();
      world.dimRoomLights();
    }
    setIsRoomDimmed(true);
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

  const handleCakeSliceProgress = useCallback((normalizedProgress: number) => {
    const world = worldRef.current;
    if (world) {
      world.setCakeSlicingProgress(normalizedProgress);
    }
  }, []);

  useEffect(() => {
    document.body.dataset.state = hasStarted ? 'playing' : 'title';
  }, [hasStarted]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* Enforce Landscape Mode on Mobile Devices */}
      <LandscapeOrientationGuard />

      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 touch-none" />

      {/* Prologue Loading / Intro */}
      {!hasStarted && (
        <PrologueLoading
          onStart={() => {
            setHasStarted(true);
            if (worldRef.current) {
              worldRef.current.hasUserInteracted = true;
              if (worldRef.current.tvVideoElement) {
                worldRef.current.tvVideoElement.play().catch(() => {});
                worldRef.current.syncTvAmbientVolume(false, isMutedRef.current, tvVolumeRef.current);
              }
            }
          }}
        />
      )}

      {/* Main HUD Controls & Dock */}
      {hasStarted && (
        <HUDControls
          questState={questState}
          snowPreset={snowPreset}
          onSetSnowPreset={handleSetSnowPreset}
          windIntensity={windIntensity}
          onSetWindIntensity={handleSetWindIntensity}
          isRoomDimmed={isRoomDimmed}
          onToggleRoomDim={handleToggleRoomDim}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPlayBirthdayMelody={handlePlayBirthdayMelody}
          onWalkButtonDown={handleWalkButtonDown}
          onWalkButtonUp={handleWalkButtonUp}
          onJoystickMove={handleJoystickMove}
          onTeleportPreset={handleTeleportPreset}
          onOpenSurpriseNote={handleOpenSurpriseNote}
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

      {/* Candle Blowing & Guided Cake Slicing Modal */}
      {showCakeModal && (
        <CakeCuttingModal
          candlesBlown={questState.candlesBlown}
          cakeCut={questState.cakeCut}
          onExtinguishCandles={handleExtinguishCandles}
          onCutCake={handleCutCake}
          onSliceProgress={handleCakeSliceProgress}
          onClose={() => setShowCakeModal(false)}
        />
      )}

      {/* Mom & Dad Birthday Blessing Modal */}
      {showParentsModal && (
        <FamilyGreetingModal onClose={() => setShowParentsModal(false)} />
      )}

      {/* Virtual TV Cinema & Low Volume Control Modal */}
      {showTvModal && (
        <VirtualTVModal
          volume={tvVolume}
          isMuted={isMuted}
          onVolumeChange={handleTvVolumeChange}
          onToggleMute={handleToggleMute}
          onClose={() => setShowTvModal(false)}
        />
      )}

      {/* Vercel Deployment Guide Modal */}
      {showVercelGuide && (
        <VercelDeployGuide onClose={() => setShowVercelGuide(false)} />
      )}
    </div>
  );
}
