# Board visual design

This is the next board presentation feature. It replaces the v1 list with a simple, Homarr-inspired tile layout without adding layout configuration, widgets, or per-device positions.

## Header

- A single sticky header spans the board. It shows the board name on the left, a centered search field, and an Admin button on the right.
- On narrow screens, the name and Admin button remain on the first row and the search field moves to a full-width second row. The header must not cause horizontal scrolling.
- The Admin button is visible to every visitor. It links to `/admin`; visitors who are not signed in follow the existing sign-in flow.
- Search remains visible for empty boards and filters only apps on the viewed board. Filtering and ranking follow [search.md](search.md).

## App tiles

- Display assigned apps as square, sharp-cornered cards with solid surfaces, hard 1px borders, and minimal depth. Each card shows the app name above a centered cached icon. Names occupy one line and use an ellipsis when too long; the full name remains available to assistive technology and on hover or focus.
- The whole tile is a link that opens the app in a new tab. It has clear hover, focus, and pressed states, a visible keyboard focus indicator, and a touch target large enough to use comfortably.
- Show no URL, hostname, widget, status indicator, or configuration control on a tile in this stage.
- Keep the board's saved manual order in left-to-right, top-to-bottom reading order. Search results use their ranked order and reflow through the same grid.

## Responsive layout and appearance

- Use a wide, centered content area with a sensible maximum width. The grid has two square tiles per row on phones. Tiles keep a consistent size and fill left to right; at wider widths additional columns appear automatically, without horizontal scrolling.
- Tile order and membership are the same at every viewport size. Do not store coordinates, separate mobile positions, custom breakpoints, or per-board layout settings.
- Use a Google-hosted monospace typeface at a 14px base and a restrained, high-contrast palette with hard 1px lines, derived from one shared set of design tokens. Use sentence case, not all caps. Follow the device's light or dark setting. Both modes keep text, icons, focus states, and tile boundaries legible. There is no manual theme control in this stage.
- Empty and no-results states remain clear and fit the new layout.

## Search interaction

- Keep client-side fuzzy filtering and result ranking. Remove the existing custom board-search keyboard shortcuts: `/`, Ctrl/Cmd+K, arrow-key result selection, Enter-to-open-a-highlighted-result, and custom Escape handling.
- Search is operated through its visible field. Native Tab navigation and Enter activation of focused app links remain available. A new keyboard interaction design is deferred.

## Acceptance checks

- Desktop and phone layouts show the same apps in saved order; phone width shows two tiles per row, and neither layout scrolls horizontally.
- Long names truncate visually without losing their accessible full names. Pointer, touch, and keyboard focus can operate every tile.
- Header placement, sticky behavior, search filtering, Admin navigation for signed-in and anonymous visitors, and light/dark appearance work at both narrow and wide widths.
- Existing board ownership, public URLs, app URLs, and search ranking remain unchanged.
