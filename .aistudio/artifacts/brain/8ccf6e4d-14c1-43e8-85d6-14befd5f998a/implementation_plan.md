# Mobile 360° Virtual Joystick, Touch-Drag Camera & Walking Fix

This update resolves the Z-axis movement bug that prevented forward/backward walking, introduces an ergonomic 360-degree virtual thumb joystick for mobile navigation (forward, backward, left, and right), and enables smooth touch-drag camera look-around across the 3D viewport.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following mobile interaction choices have been confirmed and will govern the update while preserving all existing birthday features for Sanchary:

- **Confirmed Decision 1 (360° Virtual Thumb Joystick)**: Add an always-accessible, tactile virtual thumb joystick for smooth 360-degree movement (forward, backward, strafe left, and strafe right), alongside fixing the Hold-to-Walk button for effortless one-thumb progression.
- **Confirmed Decision 2 (Touch-Drag Camera Look)**: Enable single-finger touch dragging (and desktop mouse dragging) directly on the 3D viewport to smoothly rotate the camera view horizontally and vertically, while distinguishing quick taps from drags so interactive objects (chests, door, cake, photos, TV, Mom & Dad) remain tap-responsive.

---

## 1. Overview & Core Concept

- **What It Does**: Fixes the player movement vector math so pressing/holding forward or backward moves the player along the 3D Z/X plane relative to the camera's facing angle, adds a dedicated mobile virtual thumb joystick, and lets users swipe/drag anywhere on the 3D scene to look around.
- **Target Audience / Persona**: Sanchary and friends exploring the alpine birthday experience primarily on a smartphone (as well as desktop browsers).
- **Key Value**: Transforms mobile exploration from a static camera into a fluid, tactile first-person walkthrough where walking in any direction and looking around the mountain trail and decorated farmhouse feels natural and responsive.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **360° Thumb Joystick Navigation**: On mobile and desktop, a translucent, frosted-glass virtual joystick sits in the lower-left natural thumb zone. Dragging the thumb puck in any direction smoothly walks the player forward, backward, left, or right with proportional speed and snow footstep audio.
  2. **Fixed Hold-to-Walk Button & Touch-Hold Safety**: Holding the "Hold to Walk Forward" button (or pressing `W` / `ArrowUp`) now properly advances the player along the camera's forward Z/X heading, with mobile touch-callout suppression (`touch-none select-none`) so long-pressing on iOS/Android never triggers a browser context menu.
  3. **Touch-Drag Camera Rotation**: Dragging a finger across the 3D scene smoothly pans the camera 360° horizontally (yaw) and tilts vertically (pitch, clamped to comfortable viewing angles). Releasing after a short tap (`< 8px` movement) triggers object raycasting to open chests, swing the front door, view Sanchary's framed photos, or blow out the candles.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Cozy alpine twilight HUD with dark frosted glass (`bg-slate-900/80`), warm amber accents (`text-amber-300`, `border-amber-400/40`), and high-contrast directional chevron indicators on the joystick ring.
  - *Touch Ergonomics*: Minimum `44x44px` hit targets on all mobile controls, with a `112x112px` outer joystick ring and `48x48px` draggable thumb puck positioned in the natural lower-left thumb reach zone.
  - *Typography & Hierarchy*: Retains `Cormorant Garamond` for celebratory titles and `Plus Jakarta Sans` for crisp, single-line HUD controls.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Camera-Relative Movement Vector Fix**
  - *Chosen Approach*: Replace the buggy Z-axis calculation (which previously read the 3D vector's `y` component instead of `z` and ignored camera yaw) with true camera-relative forward (`-sin(yaw), -cos(yaw)`) and right (`cos(yaw), -sin(yaw)`) basis vectors.
  - *Why*: Ensures that when the user turns the camera to face the farmhouse door, a treasure chest, or the photo wall, pushing "Up/Forward" on the joystick always walks toward what they are looking at.
- **Decision 2: Unified Pointer Event Gesture Disambiguation (Tap vs. Drag)**
  - *Chosen Approach*: Track pointer start coordinates (`pointerdown`), apply camera yaw/pitch deltas during `pointermove` once movement exceeds a `6px` threshold, and only fire 3D object interaction raycasting on `pointerup` if total drag distance is under the threshold.
  - *Why*: Allows the entire 3D canvas to act as both a touch-look trackpad and an interactive tap surface without accidental modal triggers while rotating the camera.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Application Root & HUD                        │
│                                                                      │
│  ┌───────────────────────────────┐  ┌─────────────────────────────┐  │
│  │   360° Virtual Thumbpad UI    │  │    3D Viewport Touch Look   │  │
│  │  • Multi-touch pointer capture│  │  • Pointer down/move/up     │  │
│  │  • Normalized (x, y) vector   │  │  • Yaw & Pitch damping      │  │
│  │  • Up/Down/Left/Right badges  │  │  • Tap vs. Drag threshold   │  │
│  └───────────────┬───────────────┘  └──────────────┬──────────────┘  │
│                  │                                 │                 │
│                  ▼                                 ▼                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                 First-Person Player Controller                 │  │
│  │  • Camera-relative basis math: Forward(yaw) + StrafeRight(yaw) │  │
│  │  • Fixed Z-axis displacement (moveVec.z instead of moveVec.y)  │  │
│  │  • Waypoint teleportation syncs yaw/pitch Euler angles         │  │
│  │  • Porch door & interior wall collision bounds                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Virtual Thumb Joystick**: Captures `onPointerDown`, `onPointerMove`, and `onPointerUp`/`onPointerCancel` using `setPointerCapture`. Computes normalized `dx, dy` in `[-1, 1]` and feeds them directly into the player controller's live joystick vector, while visually translating the inner thumb knob and highlighting N/S/E/W directional arrows.
  - **Hold-to-Walk Button**: Uses unified pointer events (`onPointerDown`, `onPointerUp`, `onPointerLeave`, `onPointerCancel`, `onContextMenu` prevented) so holding the button on mobile browsers reliably maintains forward velocity without sticking or losing focus.
  - **Camera Orientation Synchronization**: When the user clicks a quick-view preset (Trail, Porch, Birthday Table, TV Screen, Photo Wall), the controller computes and syncs the exact yaw and pitch Euler angles (`YXZ` order) from the look-at target so subsequent touch-dragging and walking continue seamlessly from that angle.
