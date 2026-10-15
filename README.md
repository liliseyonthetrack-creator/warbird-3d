# Sky Warbird 3D

A lightweight 3D browser game built with Three.js and designed for GitHub Pages hosting.

## Controls

- Move: `WASD` or arrow keys
- Fire: `Space`
- Boost: `Shift`
- Restart: click button or press `Enter` after a mission fail
- Gamepad: left stick to steer, triggers to fire/boost

## Run locally

From the project folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Open the repo in GitHub.
3. Go to `Settings` → `Pages`.
4. Set the source to `Deploy from a branch`.
5. Pick `main` and `/ (root)`.
6. Save.

Your game will be live at:

`https://liliseyonthetrack-creator.github.io/warbird-3d/`

## Notes

- High score is saved in the browser using `localStorage`.
- The 3D objects are simple low-poly meshes that load very quickly and work well on GitHub Pages.
