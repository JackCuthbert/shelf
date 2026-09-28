# Changelog

## [0.2.1](https://github.com/JackCuthbert/shelf/compare/v0.2.0...v0.2.1) (2026-09-28)


### Bug Fixes

* **docker:** pin Node 24 to restore ARM64 builds ([ee0e17b](https://github.com/JackCuthbert/shelf/commit/ee0e17be0eb6f676149b79a2a70c3e1bc635a3f5))

## [0.2.0](https://github.com/JackCuthbert/shelf/compare/v0.1.0...v0.2.0) (2026-09-28)


### ⚠ BREAKING CHANGES

* Shelf record IDs change to Nano IDs; apply the included database migration before starting the updated app.
* the `HOMETIME_ICON_DIR` environment variable is now `SHELF_ICON_DIR`. Deployments that set the old variable must update it. The npm package name and container/image name also change to `shelf`.

### Features

* add account menu and settings page ([e983bbb](https://github.com/JackCuthbert/shelf/commit/e983bbbc45a989673cc2dafc89aa330cc91a171e))
* add agent REST API and account API keys ([b201440](https://github.com/JackCuthbert/shelf/commit/b2014400ea308593b8b2283cc3a54225bc41e2e4))
* add apps from uncategorised board section ([bcbdd86](https://github.com/JackCuthbert/shelf/commit/bcbdd867a4f96035df905aadf7f3f4d4399f3c42))
* add board categories with grouped app ordering ([815c5e3](https://github.com/JackCuthbert/shelf/commit/815c5e37909ca64666d5eeee2c7df0f6243bcb01))
* add configurable OIDC sign-in and account linking ([e821eb3](https://github.com/JackCuthbert/shelf/commit/e821eb35f827d0502c9b11fae051876159650bce))
* add descriptions to shared apps ([e1a2621](https://github.com/JackCuthbert/shelf/commit/e1a26216f14f484a55209dae5421a5b48956cb3a))
* add docs page and shared site footer ([e0d96d4](https://github.com/JackCuthbert/shelf/commit/e0d96d44337ca6836afc7e1c6b40938c31211b7e))
* add example docker compose ([5dd380e](https://github.com/JackCuthbert/shelf/commit/5dd380e591b13b8fec6b3b39ffcdb15aa6b5316e))
* add fuzzy board app search and keyboard navigation ([104f07f](https://github.com/JackCuthbert/shelf/commit/104f07ff14742898c3868617b406bed5a346048e))
* add Hometime account setup and Docker runtime ([10429bf](https://github.com/JackCuthbert/shelf/commit/10429bf0883ab0a1525902778997f0acfa578695))
* add instance board switcher to public header ([1a4d5b9](https://github.com/JackCuthbert/shelf/commit/1a4d5b9a3405adadad78f6004ca15b7cb87646fa))
* add manual app status checks in library ([bc6a0ed](https://github.com/JackCuthbert/shelf/commit/bc6a0edeadf32cf79305330cf83d34e351eb40ec))
* add owned app details and board actions ([d0350b3](https://github.com/JackCuthbert/shelf/commit/d0350b3c7dae367ec4cb88d78d0e469811b4dbf5))
* add owned boards and public board views ([570c76c](https://github.com/JackCuthbert/shelf/commit/570c76c8ed0d646fa72716efadfa8b60b9425259))
* add public board landing and dedicated login page ([abff655](https://github.com/JackCuthbert/shelf/commit/abff65522617c351ddc96394f2a15bb3328daeaa))
* add shared app library and local icon caching ([6eb63c3](https://github.com/JackCuthbert/shelf/commit/6eb63c3db21cf728a527ac73d14fd7ea3598bbe9))
* cache a custom image URL as an app icon ([91cbad9](https://github.com/JackCuthbert/shelf/commit/91cbad9c4f34a7e117ef265c54a523f70ecb0400))
* cache app probes and add manual check API ([83d1993](https://github.com/JackCuthbert/shelf/commit/83d19938c74c26a5cd3a316fca89bfe967abe793))
* compact shared app library rows ([3a7cffb](https://github.com/JackCuthbert/shelf/commit/3a7cffb72eb2239e3d8f69728e77f3f132f897a0))
* enrich public app details and navigation ([3f17f53](https://github.com/JackCuthbert/shelf/commit/3f17f5362de8330c323b45eec6541494d58931d9))
* explain uncategorised board apps ([2bd42b0](https://github.com/JackCuthbert/shelf/commit/2bd42b09e26dc6655110726333c2bb90ffdbabfb))
* import apps from a Homarr instance ([1395fb6](https://github.com/JackCuthbert/shelf/commit/1395fb6f4c13360cdad3bbfbdde3800a23d1ee3c))
* improve board management and app ordering ([cdc98ad](https://github.com/JackCuthbert/shelf/commit/cdc98ad78427cb789af382b1657ef41b6fe9cff5))
* manage board assignments and liveness details from admin ([ed553c7](https://github.com/JackCuthbert/shelf/commit/ed553c7fb4f63f05019134a5ce7089dff5e3c5d3))
* nest management pages under admin ([db042fd](https://github.com/JackCuthbert/shelf/commit/db042fde0f8e920b8dff1de1571d2f63309d07a2))
* redesign the board and admin interface ([18401f8](https://github.com/JackCuthbert/shelf/commit/18401f89f601a9fc96046cb6f21b1dac2156f1ec))
* refine the board and admin UI ([0292760](https://github.com/JackCuthbert/shelf/commit/0292760cf4a1f0579d970d5c81c46973a20df2a5))
* show app availability on board tiles ([ee2ca9f](https://github.com/JackCuthbert/shelf/commit/ee2ca9f13c869fc368e7c1a9cfb1d5c06614d60b))
* split board list and editor views ([8ffef33](https://github.com/JackCuthbert/shelf/commit/8ffef33d1067a7228b33ae6e4e3e62467a64e9e4))
* streamline adding apps from boards ([1dfdf96](https://github.com/JackCuthbert/shelf/commit/1dfdf96fbec8261be3d6e11484f1f4e0b8d65c2d))
* streamline board category controls ([a3c9049](https://github.com/JackCuthbert/shelf/commit/a3c904912daec278d77505525e2993059ba80c6c))
* use Nano IDs as Shelf primary keys ([ab435a7](https://github.com/JackCuthbert/shelf/commit/ab435a79cf41075ad12d34f53e751f95c82e3249))
* use short Nano IDs for board links ([89407d9](https://github.com/JackCuthbert/shelf/commit/89407d960362250f977961722f69326ecae4ad9a))


### Bug Fixes

* accept self-signed certificates in app status probes ([9bc7beb](https://github.com/JackCuthbert/shelf/commit/9bc7beb5e33ee10b4409e89d2c9c1e87f09a4c17))
* align board app action spacing ([28dfe59](https://github.com/JackCuthbert/shelf/commit/28dfe59bb3b1f0c0d544d26fa46f51f6be146089))
* align create modal titles with buttons ([3bc96b7](https://github.com/JackCuthbert/shelf/commit/3bc96b7d0e8afd4df9d68af3f4c1ee780665e31f))
* allow configured remote development origin ([d546c74](https://github.com/JackCuthbert/shelf/commit/d546c74d1bd25f7cd17b9548d842ab3e4e7575a8))
* **ci:** exclude generated changelog from formatting ([395eb51](https://github.com/JackCuthbert/shelf/commit/395eb5121d866eeebe8d68b223f696e9612f4ec7))
* clear default board before deleting last board ([9272777](https://github.com/JackCuthbert/shelf/commit/92727772a4c0b09accd927b952ae44a42c186cfd))
* compile Tailwind styles in Next.js ([51956c9](https://github.com/JackCuthbert/shelf/commit/51956c98afee79b151862b73be44a2fc5e3a17d7))
* handle missing descriptions when editing apps ([d0a6b91](https://github.com/JackCuthbert/shelf/commit/d0a6b9112e5f06246a7f892c789413d1eb624c81))
* improve shared app action accessibility ([a21fd56](https://github.com/JackCuthbert/shelf/commit/a21fd5635887ce845120cde42fe0b274ab752bb3))
* keep disabled buttons visually unchanged on hover ([a158982](https://github.com/JackCuthbert/shelf/commit/a158982dfde5b758877980347a18a420cce30eb9))
* label app status check action ([193b394](https://github.com/JackCuthbert/shelf/commit/193b394c3e71861dde6fe6ef710057459f3c51d9))
* make sign out a direct account menu action ([f7ff314](https://github.com/JackCuthbert/shelf/commit/f7ff314affd2c4b3af53fddd07de8501a9014b08))
* open app descriptions from tile focus ([99009db](https://github.com/JackCuthbert/shelf/commit/99009dbf49e79df43e4a3cf1eb80596d33994b1f))
* preserve menu semantics in delete action ([ece78df](https://github.com/JackCuthbert/shelf/commit/ece78dfe59aec275dd51c9665a16c1c9eb755ebf))
* prevent board link hydration mismatch ([ce40eba](https://github.com/JackCuthbert/shelf/commit/ce40eba0b4e13b6108d44167614e9d0830f2172c))
* preview selected icons before saving ([bfaff78](https://github.com/JackCuthbert/shelf/commit/bfaff7860776247579a9bbf1440405292c4c1fee))
* refine the board category and admin UI ([b44d241](https://github.com/JackCuthbert/shelf/commit/b44d241f666be65a1445c0642b1677ceacb96c0a))
* refresh board app picker after app changes ([1125f49](https://github.com/JackCuthbert/shelf/commit/1125f490a4fbb202d6784db7e22004a07253dab5))
* render app check times deterministically ([a14facb](https://github.com/JackCuthbert/shelf/commit/a14facb7c62815cba88d128b68baeb941e835dab))
* render login after database migrations ([922ac73](https://github.com/JackCuthbert/shelf/commit/922ac7302e5ff38d4bbd9d0402c0f7800274b637))
* return to Hometime after OIDC sign-out ([6e613de](https://github.com/JackCuthbert/shelf/commit/6e613def09da320f095aeb72baaab148a757d931))
* separate sign-in and sign-up including OIDC registration ([285d427](https://github.com/JackCuthbert/shelf/commit/285d4273c26e821a313120b955f06b5162a3a22f))
* show app status with green red and pulsing grey dots ([2a38679](https://github.com/JackCuthbert/shelf/commit/2a38679aa5b8b77ce24a74a1627d4718a15635f5))
* support a local icon directory for development ([ad33397](https://github.com/JackCuthbert/shelf/commit/ad33397ee64fcc957c3e1637dd19a745f30bb954))
* use OpenAPI-aware category schema ([3e59f57](https://github.com/JackCuthbert/shelf/commit/3e59f570a17c80b42af53e5ac8abcb6ca2e885b0))


### Code Refactoring

* rename app from Hometime to Shelf ([eb83fac](https://github.com/JackCuthbert/shelf/commit/eb83facb0eabb670e3557de4748c00e4f50c5b5b))
