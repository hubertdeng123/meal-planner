# Organic linen overhaul

Built on the current `main` app (streaming v2, week planner, cook mode, shop, pantry). This pass changes the visual system without changing those flows.

## Direction

The previous shell was a basil-green product with a tomato second accent and a flat sidebar. This version is a warm kitchen: oat linen surfaces, Fraunces display type, Plus Jakarta Sans for UI, and a single clay accent (`#A63E24`, about 5.4:1 with white).

## What changed

- Tokens in `frontend/src/index.css`: clay primary, linen page, softer borders, pill buttons, `rounded-3xl` cards.
- Shell: floating rounded sidebar, floating mobile tab bar, more page padding.
- Auth: light linen panel instead of the dark forest column.
- Cook mode: espresso background with clay progress, not basil.
- Recipe covers: warm clay, oat, and sage washes only.

Routes, copy used by tests, streaming, autosave, and the demo chef are unchanged.
