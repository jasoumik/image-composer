# Image Composer — Feature Reference

A web-based image composition tool built with React, TypeScript, and Fabric.js.

---

## Table of Contents

1. [Image Management](#image-management)
2. [Logo Overlay](#logo-overlay)
3. [Text Layers](#text-layers)
4. [Shape Tools](#shape-tools)
5. [Image Filters](#image-filters)
6. [Object Editing](#object-editing)
7. [Lock Object](#lock-object)
8. [Canvas Management](#canvas-management)
9. [Background Fill](#background-fill)
10. [Grid Overlay](#grid-overlay)
11. [Cropping](#cropping)
12. [History — Undo / Redo](#history--undo--redo)
13. [Export](#export)
14. [Keyboard Shortcuts](#keyboard-shortcuts)
15. [Session Persistence](#session-persistence)
16. [Responsive Layout](#responsive-layout)

---

## Image Management

- Drag-and-drop upload or click-to-browse for background images.
- Uploaded image auto-fits to the canvas while preserving aspect ratio.
- Native (full) resolution is stored separately and used at export time.
- Background image is protected — it cannot be accidentally selected, moved, deleted, or reordered.

---

## Logo Overlay

- Upload a PNG or SVG file as a logo overlay.
- Logo is placed at 30 % of canvas width and centred automatically.
- Aspect ratio is maintained on load.
- After placement the logo is a standard selectable object supporting all Object Editing operations.

---

## Text Layers

Add any number of text layers from the **Text** panel.

| Option | Details |
|---|---|
| Content | Free-form text; press Enter to add |
| Font family | 25 Google Fonts (Poppins, Montserrat, Bebas Neue, Dancing Script, and more) |
| Color | Color picker |
| Font size | 0 – 400 px (default 24 px) |

### Text Style (Edit panel)

- Change font family, color, and size.
- Toggle **Bold** and **Italic**.
- Alignment: Left / Center / Right.
- **Letter spacing** slider (−200 to +800).
- Changes applied on **Apply** click.

### Text Appearance (Edit panel)

- Toggle stroke (outline) on/off.
- Stroke color picker (shown when stroke is enabled).
- Stroke width (0 – 20 px).
- Changes applied on **Apply** click.

---

## Shape Tools

Add basic shapes from the **Shapes** panel.

| Shape | Details |
|---|---|
| Rectangle | Centered square, 25 % of canvas size |
| Circle | Centered ellipse, 25 % of canvas size |

- Choose a fill color before adding.
- Shapes support all Object Editing operations (opacity, filters, lock, duplicate, etc.).

---

## Image Filters

Available for any image object (background or logo).

| Filter | Range |
|---|---|
| Brightness | −1 to +1 |
| Contrast | −1 to +1 |
| Saturation | −1 to +1 |

- Sliders provide **live preview** while dragging.
- History snapshot saved on slider **release**.
- **Reset Filters** restores all three values to 0.

---

## Object Editing

Select any non-background object to access the Edit panel.

### Transform

| Action | Detail |
|---|---|
| Opacity | 0 – 100 % slider |
| Bring Forward | Move one layer up |
| Send Backward | Move one layer down |
| Flip Horizontal | Mirror on X axis (images only) |
| Flip Vertical | Mirror on Y axis (images only) |
| Duplicate | Clone with 20 px offset |

### Native Fabric.js interactions

All objects support drag, free resize, and free rotation directly on the canvas.

### Keyboard nudge

With an object selected, use arrow keys to move it 1 px, or **Shift + Arrow** for 10 px.

### Remove

**Remove Element** button in the Edit panel and a floating **Delete** button on the canvas.

---

## Lock Object

- **Lock** button in the Edit → Transform panel freezes an object in place.
- Locked objects cannot be moved, resized, or rotated.
- They remain visible and selectable so they can be unlocked at any time.
- Lock state is saved to history and survives page reload.

---

## Canvas Management

Choose from presets or enter custom dimensions in the **Canvas** panel.

| Preset | Dimensions |
|---|---|
| Square 1:1 | 1080 × 1080 px |
| Landscape 16:9 | 1920 × 1080 px |
| Portrait 4:5 | 1080 × 1350 px |
| Story 9:16 | 1080 × 1920 px |
| Twitter/X | 1500 × 500 px |

- All objects scale proportionally on resize.
- Background image re-covers the new dimensions.
- Canvas display scales to fit the viewport; export uses native dimensions.

---

## Background Fill

Apply a solid color or gradient background without uploading an image.

### Solid

- Pick any color and press **Apply** — the canvas background updates instantly.

### Gradient

- Choose a start color, end color, and angle (0 – 360°).
- Press **Apply** to render a linear gradient across the canvas.

Both types work alongside an uploaded background image and survive undo/redo and page reload.

---

## Grid Overlay

- **Show Grid / Hide Grid** toggle in the Canvas panel.
- Renders a subtle white grid guide (50 px spacing) over the canvas.
- Guide only — not included in exported images.

---

## Cropping

Available via the **Crop** button in the Background panel.

1. A resizable crop rectangle appears over the canvas.
2. Drag and resize to select the region to keep.
3. **Apply Crop** exports only the selected region and reloads it as the new background.
4. **Cancel** removes the crop UI without changes.

---

## History — Undo / Redo

- Up to **30 snapshots** maintained.
- Undo and Redo buttons always visible in the footer (desktop) and bottom toolbar (mobile).
- New action after undo discards forward history.
- Filter slider adjustments create a single snapshot on release.

---

## Export

### Format & Quality

| Format | Quality control |
|---|---|
| PNG | Lossless — no quality slider |
| JPG | Quality slider 10 – 100 % |
| WebP | Quality slider 10 – 100 % |

- **Desktop** — format selector and quality slider appear in the sidebar footer above the Download button.
- **Mobile** — tap **Save** to open an export sheet with format selector, quality slider, and a Download button.

### File naming

Downloaded files are named by timestamp: `YYYYMMDD-HHmm.<ext>` (e.g. `20260524-1435.png`).

### Resolution

Export renders at the **native resolution** of the original background image, not the scaled display size.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl / Cmd + Z` | Undo |
| `Ctrl / Cmd + Shift + Z` | Redo |
| `Delete` / `Backspace` | Remove selected object |
| `Arrow keys` | Nudge selected object 1 px |
| `Shift + Arrow keys` | Nudge selected object 10 px |

> Delete/Backspace is ignored while a text field has focus.

---

## Session Persistence

- Every action is saved to **localStorage** automatically.
- Reloading the page restores the full canvas — all objects, text, filters, lock states, and canvas size.
- Pressing **Clear Canvas** is the only way to wipe the saved session.

---

## Responsive Layout

### Desktop (≥ 1024 px)

- Fixed 288 px left sidebar with collapsible sections.
- Canvas section pinned below the scrollable area (inputs never trigger auto-scroll).
- Footer contains Undo, Redo, Clear, export format selector, and Download.

### Tablet (640 – 1023 px)

- Full-width canvas with reduced height.
- Sidebar replaced by bottom toolbar.

### Mobile (< 640 px)

- Full-width canvas (≈ 52 % of viewport height).
- Horizontally scrollable bottom toolbar (72 px) with larger icons.
- Tapping a tab opens a **slide-up drawer** (max 70 % viewport height).
- Tapping **Save** opens an export options sheet with format, quality, and download.
- The **Edit** tab is hidden when nothing is selected.
- All touch targets are at least 44 px.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript |
| Canvas engine | Fabric.js 5 |
| Styling | Tailwind CSS 4 |
| Build tool | Vite 8 |
| Fonts | Google Fonts (loaded via `index.html`) |
| Persistence | Browser localStorage |
