# Board search

- Every board has a visible search input. Filtering uses only apps assigned to the current board and runs in the browser over the loaded board data, without a server request for each keystroke.
- Match app names case-insensitively with fuzzy tolerance: prefixes and substrings match, and a near miss such as `sonr` can find `Sonarr`. A query such as `sona` finds `Sonarr`.
- Results rank by match quality; ties keep the board's manual order. With an empty query, show all apps in manual order. An unmatched query shows a clear no-results message.
- The input and results have visible focus states and accessible labels. App links remain reachable with Tab and operable with Enter through normal browser behavior.
- The board visual-design stage removes custom search keyboard shortcuts, including `/`, Ctrl/Cmd+K, arrow-key result selection, Enter-to-open-a-highlighted-result, and custom Escape handling. Keyboard search interaction will be redesigned later.
- Search state is local to the viewed board and resets on navigation to another board.
