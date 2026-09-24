# Board search and keyboard navigation

- Every board has a visible search input. Filtering uses only apps assigned to the current board and runs in the browser over the loaded board data, without a server request for each keystroke.
- Match app names case-insensitively with fuzzy tolerance: prefixes and substrings match, and a near miss such as `sonr` can find `Sonarr`. A query such as `sona` finds `Sonarr`.
- Results rank by match quality; ties keep the board's manual order. With an empty query, show all apps in manual order. An unmatched query shows a clear no-results message.
- While search is focused, the first result is highlighted as the query changes. Up and Down move the highlight through results and wrap at the ends. Enter immediately opens the highlighted app in a new tab. Enter with no result does nothing. Escape clears the query.
- `/` or Ctrl/Cmd+K focuses the search input when focus is elsewhere on the board. These shortcuts do not hijack typing in another input or editable control.
- The input and results have visible focus/highlight states and accessible labels. App links remain reachable with Tab and operable with Enter without using search.
- Search state is local to the viewed board and resets on navigation to another board.
