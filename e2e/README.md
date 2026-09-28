# README screenshots

Install Chromium once, including its Linux dependencies when needed:

```sh
npx playwright install --with-deps chromium
```

Run `npm run screenshot` after visible UI changes and include the images in
`docs/screenshots/` with the change. This builds Shelf, starts a headless browser,
and captures the public board, board management, public app details, and populated
Create app dialog. Normal `npm test` runs do not regenerate images.

All images use the same 1280 × 841 light-mode viewport, sized to fit the board.
Long management views are cropped to that frame.

The generator recreates only `data/screenshots/`, using sample credentials and
cached icons. It starts its own server at `http://127.0.0.1:3310`; that port must
be free. The third-party icon catalogue and preview requests use local fixtures.

Icons in `fixtures/icons/` are from
[Dashboard Icons](https://github.com/homarr-labs/dashboard-icons).
