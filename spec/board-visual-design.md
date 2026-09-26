# Board visual design

This is the next board presentation feature. It replaces the v1 list with a simple, Homarr-inspired tile layout without adding layout configuration, widgets, or per-device positions.

## Header

- A single sticky header spans the board. It shows the board name on the left, a centered search field, and an account control on the right. The browser tab title shows the board name followed by the site name, separated by a middle dot: `Home · Shelf`.
- The board name is a Base UI dropdown trigger with a chevron, retaining the two-line `Shelf` / board-name style. Its menu lists all instance boards with their owners, ordered by owner and then board name. The current board is disabled at normal text contrast. A signed-in user's default board has a star, including when they are viewing another board. The selected option has a subtle accent tint and a thin, continuously rotating multicolor accent border. Keep the trigger's open and hover states visible and the menu spacing even and compact. The menu supports keyboard, pointer, and touch input.
- On narrow screens, the name and account control remain on the first row and the search field moves to a full-width second row. The header must not cause horizontal scrolling.
- Signed-in visitors see the shared user menu used in admin: a person icon and display name, with Account, Boards, Apps, and Sign out actions. Anonymous visitors see a Sign in button. The menu must work with keyboard, pointer, and touch input.
- Search remains visible for empty boards and filters only apps on the viewed board. Filtering and ranking follow [search.md](search.md).

## App tiles

- Display assigned apps as square, sharp-cornered cards with solid surfaces, hard 1px borders, and minimal depth. Each card shows the app name above a centered cached icon. Names occupy one line and use an ellipsis when too long; the full name remains available to assistive technology and on hover or focus.
- The whole tile is a link that opens the app in a new tab. It has clear hover, focus, and pressed states, a visible keyboard focus indicator, and a touch target large enough to use comfortably.
- Right-clicking or long-pressing a tile opens a Base UI context menu with links to the app detail page and app URL, plus a Copy app link action. The app owner can edit or delete the shared app there. The description popover stays closed while the context menu or an edit/delete dialog is open.
- Show no URL, hostname, widget, or configuration control on a tile. Show liveness status as specified in [app-status.md](app-status.md). When an app has a description, show it in a popover that opens immediately on tile hover or keyboard focus. Provide a separate info button to open the popover only on devices with a touch input, positioned at the tile's bottom-left; activating the tile itself still opens the app. The popover opens above the tile's centre, flipping below when it would otherwise be clipped by the viewport top, and renders above the sticky header. Apps without descriptions have no info button or popover.
- Keep the board's saved manual order in left-to-right, top-to-bottom reading order. Search results use their ranked order and reflow through the same grid.
- Board categories add full-width sections below uncategorized tiles. Within each section, apps use this same tile grid; see [categories.md](categories.md).

## Responsive layout and appearance

- Use a wide, centered content area with the same maximum width as the header. The grid shows one square tile per row on very narrow screens, two from 360px, three at the small breakpoint, four at the medium breakpoint, five at the large breakpoint, and six at the extra-large breakpoint. Columns divide the available width equally, so every row fills the content width; unused space only appears at the end of a row with fewer apps than columns. No layout scrolls horizontally.
- Tile order and membership are the same at every viewport size. Do not store coordinates, separate mobile positions, custom breakpoints, or per-board layout settings.
- Use a Google-hosted monospace typeface at a 14px base and a restrained, high-contrast palette with hard 1px lines, derived from one shared set of design tokens. Use sentence case, not all caps. Follow the device's light or dark setting. Both modes keep text, icons, focus states, and tile boundaries legible. There is no manual theme control in this stage.
- Empty and no-results states remain clear and fit the new layout.

## Search interaction

- Keep client-side fuzzy filtering and result ranking. Remove the existing custom board-search keyboard shortcuts: `/`, Ctrl/Cmd+K, arrow-key result selection, Enter-to-open-a-highlighted-result, and custom Escape handling.
- Search is operated through its visible field. Native Tab navigation and Enter activation of focused app links remain available. A new keyboard interaction design is deferred.

## Acceptance checks

- Desktop and phone layouts show the same apps in saved order; very narrow widths show one tile per row, phone width shows two, and neither layout scrolls horizontally. Rows fill the content width at every breakpoint.
- Long names truncate visually without losing their accessible full names. Pointer, touch, and keyboard focus can operate every tile.
- Header placement, sticky behavior, search filtering, signed-in menu and anonymous Sign in navigation, and light/dark appearance work at both narrow and wide widths.
- Existing board ownership, public URLs, app URLs, and search ranking remain unchanged.
