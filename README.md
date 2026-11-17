![hugin](https://user-images.githubusercontent.com/36674091/198717153-c46bdb04-f3b4-45c0-ace4-0f9a41675911.png)

# Hugin Desktop

Hugin Messenger for Windows, macOS and Linux (Electron + SvelteKit). Hugin sends end-to-end
encrypted messages over the Kryptokrona (XKR) network: private messages, group rooms and a
feed, relayed by other users and Hugin nodes. Calls with voice and video, screen sharing and
file sharing run peer to peer.

The wallet uses kryptokrona-wallet-backend-js with kryptokrona-crypto 2.0 (a Node-API addon), and
the P2P layer is `hugin-network` (Hyperswarm), shared with the mobile app.

## Requirements

- Node.js 20
- pnpm 10.33.4 (the `packageManager` field in `package.json`; `corepack enable` picks it up)
- Build tools for the native modules (better-sqlite3-multiple-ciphers, uiohook-napi, @koush/wrtc),
  as in `.github/workflows/`:
  - Linux (Debian/Ubuntu):
    ```sh
    sudo apt-get install -y build-essential libx11-dev libxt-dev libxtst-dev libxkbfile-dev \
        libxrandr-dev libxi-dev libxinerama-dev libxcursor-dev libudev-dev
    ```
  - macOS: Python 3.11 and setuptools (`brew install python-setuptools`), Xcode command line tools.
  - Windows: Visual Studio 2022 with the C++ workload (MSBuild); set `GYP_MSVS_VERSION=2022`.
  - Linux and macOS builds use `CXXFLAGS=-std=gnu++17` for the native modules.

On NixOS, `flake.nix` and `.envrc` (direnv) provide the dev shell.

## Get started

```sh
git clone https://github.com/kryptokrona/hugin-desktop
cd hugin-desktop
pnpm install          # postinstall runs patch-package and electron-rebuild
pnpm run dev          # Vite dev server and Electron together
pnpm run test:backend # backend tests (node:test, no Electron)
```

`.npmrc` sets `node-linker=hoisted`: Electron and the native modules need a flat `node_modules`.

## Build

|                          |                              |
|--------------------------|------------------------------|
| macOS Apple Silicon      | · `pnpm run build:mac-arm64` |
| macOS Intel (x64)        | · `pnpm run build:mac-x64`   |
| Windows                  | · `pnpm run build:win-x64`   |
| Linux (deb)              | · `pnpm run build:linux-x64` |

The packages land in `dist/`. These scripts never publish; the `*-gh` variants are for the release
pipeline.

## Dependencies and release

Until they are on npm, the wallet and Hugin libraries come from sibling checkouts, each built
first: `../../kryptokrona-crypto`, `../../kryptokrona-utils`, `../../kryptokrona-wallet-backend-js`,
`../hugin-crypto`, `../hugin-p2p` (hugin-network) and `../hugin-pow`.

Before a release, switch them to the published packages and make a fresh lockfile
(`pnpm install`): kryptokrona-crypto `^2.0.0`, kryptokrona-utils `^1.5.0`,
kryptokrona-wallet-backend-js `^2.7.0`, hugin-network `^3.0.0`, hugin-pow `^1.0.0` and
hugin-crypto `^1.1.0`. Keep the `pnpm.overrides` entries, so the tree has one copy of each.

Pushes to `main` build all platforms in CI; tags run the release pipeline.

## License

GPL-3.0 (`LICENSE`).
