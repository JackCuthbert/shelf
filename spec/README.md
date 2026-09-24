# Hometime specification

Hometime is a small, self-hosted dashboard for one household. It provides a shared library of app links and individually owned boards. The experience favors a reliable mobile layout, simple board editing, and fast search over configurable layouts, widgets, and integrations.

## V1 feature specifications

| Feature                                | File                                   |
| -------------------------------------- | -------------------------------------- |
| System architecture and data ownership | [architecture.md](architecture.md)     |
| Accounts, setup, and access            | [accounts.md](accounts.md)             |
| Apps and icon selection                | [apps-and-icons.md](apps-and-icons.md) |
| Boards and display                     | [boards.md](boards.md)                 |
| Board categories                       | [categories.md](categories.md)         |
| App liveness status                    | [app-status.md](app-status.md)         |
| Homarr app import                      | [homarr-import.md](homarr-import.md)   |
| Board search                           | [search.md](search.md)                 |
| Management interface                   | [admin.md](admin.md)                   |
| Deployment and persistence             | [deployment.md](deployment.md)         |
| Deferred features and exclusions       | [future.md](future.md)                 |

## Next feature specification

| Feature                           | File                                             |
| --------------------------------- | ------------------------------------------------ |
| Responsive board tiles and header | [board-visual-design.md](board-visual-design.md) |

V1's responsive list remains described in [boards.md](boards.md). The next feature replaces that presentation with responsive tiles and removes custom search keyboard shortcuts.
