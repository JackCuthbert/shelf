# Board categories

Categories organize apps on one board. They do not change the shared app library or another board's layout.

## Records and ownership

- A category belongs to exactly one board. It has a nonempty title of at most 80 characters, an optional plain-text description of at most 280 characters, and a persisted position among that board's categories. Titles are trimmed and unique within a board, ignoring case.
- A board app assignment belongs to at most one category on its board. An assignment with no category is uncategorized. An app still appears only once per board, even when categories exist.
- Existing boards gain no categories during migration. Their existing app assignments remain uncategorized and retain their order. Deleting a board deletes its categories; deleting a shared app removes its assignments as before.
- Only the board owner can create, rename, describe, reorder, or delete categories, or change an assignment's category. Public board visitors can only read them through the board URL.

## Board display

- Show uncategorized apps first in their saved manual order. Then show categories in their saved top-to-bottom order as full-width sections. Each section shows its title and, when present, its description above its app tiles.
- Apps within a category use the same responsive tiles, link behavior, description popovers, and other tile details as uncategorized apps. Their saved manual order fills the grid left to right, top to bottom.
- Show an empty category with its title and description and a short note such as “No apps assigned.” Show the board-level empty state only when the board has neither assigned apps nor categories.
- Board search still matches app names only. With a query, keep uncategorized results first and categories in manual order, rank matching apps within each group, and hide categories with no matches. Hide the uncategorized group when it has no matches. If no app matches anywhere, show the board-level no-results state. With an empty query, use manual app order within each group.

## Management and ordering

- The board owner can create and edit a category, move categories up or down, and delete a category with confirmation. Category controls work with pointer, touch, and keyboard input; drag and drop is not required.
- Adding a shared app to a board offers an optional category selection, defaulting to uncategorized. The owner can move an existing assignment into another category or back to uncategorized. Moving to a new group appends the app to that group's end. Within each group, Move up / Move down changes only that group's app order.
- Deleting a category moves its apps to the end of the uncategorized group in their existing relative order; it does not remove those apps from the board. The category and assignment changes persist together.
- Maintain deterministic positions for categories and app assignments after moves, category deletion, assignment removal, and app deletion. The existing board app position can remain one board-wide sequence; category membership determines grouping, and positions determine order within each group.

## Acceptance checks

- Existing boards display their apps in the same order after migration.
- One app cannot be assigned twice to the same board or appear in two categories on that board. An assignment cannot reference a category from another board.
- Category order, category membership, and app order within each group persist across reloads and do not change other boards.
- Deleting a populated category preserves its apps, app order relative to one another, links, and descriptions.
- Empty categories and category descriptions remain accessible at phone and desktop widths without horizontal scrolling.
- Search keeps group order, ranks matches within groups, hides groups without matches, and shows a clear no-results state when appropriate.
