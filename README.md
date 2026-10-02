# Architect

A top-down building planner in TypeScript + React. You pick a piece from a radial
**building plan** menu (piece type › variant › material › texture), then place it on
the grid. Placing a piece spends resources.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run build      # typecheck + production build
```

URL options: `?accent=%234FB3D9` sets the accent colour, and `?labels=off` hides the node labels.

## Controls

| Input | Action |
| --- | --- |
| Click nodes / **◂ BACK** | Walk the menu; click the deepest pick again to un-pick it |
| **PLACE** | Close the menu and start placing the selected piece |
| **LMB** | Place the ghost (while placing) |
| **RMB** | Open the building plan (your picks stay) |
| **ESC** | Up one level; while placing, back to the menu |
| **WHEEL** | Cycle material (keeps the texture when the new material has it) |
| **T** / **Shift+T** | Cycle texture |
| **R** | Rotate. Walls and beams move to another edge of their foundation, and pillars to another corner |
| **X** | Demolish the piece under the cursor (refunds 50%; a foundation takes what stands on it) |

## Rules

- Each foundation covers a 2×2 block of grid cells. Foundations must sit on free ground.
- Every other piece snaps onto the foundation under the cursor. Two pieces can't overlap on the same layer
  (stairs < walls/supports < floors < roofs).
- Cost and health come from material × variant multiplier. Texture is cosmetic only.

## Layout

- `src/catalog.ts`: pieces, materials, textures (data only)
- `src/selection.ts`: menu path → selection, picking, cycling, stats
- `src/radial.ts`: radial menu geometry
- `src/world.ts`: grid, footprints, placement rules, demolish
- `src/components/`: React views; `styles.css` holds the design tokens
