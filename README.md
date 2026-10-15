# Sky Warbird 3D

A lightweight browser game inspired by military aviation combat. It is built with Three.js and designed to be easy to host on GitHub Pages.

## Features

- 3D flight combat in a sky battlefield
- Keyboard controls and basic gamepad support
- Score, health, and best-score tracking
- Third-person and first-person camera toggle (`C`)
- Enemy interceptors, shots, explosions, and hit effects
- Sound toggle (`M` or the on-screen button)
- Lightweight assets and procedural geometry for easy hosting

## Controls

- Move: `WASD` or arrow keys
- Fire: `Space`
- Boost: `Shift`
- Camera toggle: `C`
- Sound toggle: `M`
- Restart after defeat: `Enter` or use the button
- Gamepad: left stick steers, right trigger fires, boost button activates speed

## Run locally

From the project folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in the browser.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Open the repository in GitHub.
3. Go to `Settings` -> `Pages`.
4. Set the source to `Deploy from a branch`.
5. Select `main` or `gh-pages`, and choose `/ (root)`.
6. Save and wait for deployment.

Then your page will be live at one of these URLs:

- `https://liliseyonthetrack-creator.github.io/warbird-3d/`

## Notes

- The game uses procedural 3D meshes rather than large external models for quick loading and easy portability.
- High score is saved in the browser with `localStorage`.
- This is a strong v1.0 foundation for a larger combat-airbird game.
