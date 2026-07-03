![hugin](https://user-images.githubusercontent.com/36674091/198717153-c46bdb04-f3b4-45c0-ace4-0f9a41675911.png)


<p>
<a href="https://github.com/kryptokrona/hugin-desktop/actions/workflows/main-ci.yml">
    <img src="https://github.com/kryptokrona/hugin-desktop/actions/workflows/main-ci.yml/badge.svg">
</a>
<a href="https://chat.kryptokrona.se">
    <img src="https://img.shields.io/discord/562673808582901793?label=Discord&logo=Discord&logoColor=white&style=flat">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/issues">
    <img src="https://img.shields.io/github/issues/kryptokrona/hugin-desktop">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/pulls">
    <img src="https://img.shields.io/github/issues-pr/kryptokrona/hugin-desktop">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/commits/main">
    <img src="https://img.shields.io/github/commit-activity/m/kryptokrona/hugin-desktop">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/kryptokrona/hugin-cache">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/kryptokrona/hugin-desktop">
</a>
<a href="https://twitter.com/kryptokrona">
    <img src="https://img.shields.io/twitter/follow/kryptokrona">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/releases/latest">
    <img src="https://img.shields.io/github/downloads/kryptokrona/hugin-desktop/total">
</a>
<a href="https://github.com/kryptokrona/hugin-desktop/releases/latest">
    <img src="https://img.shields.io/github/downloads/kryptokrona/hugin-desktop/latest/total">
</a>
</p>

Hugin is a messaging service where messages are relayed by other users and Hugin nodes.
Your messages are secured with industry leading encryption so that only you and your chat partner have the possibility to read them.
**The purpose** is **not** to gather any personal information about the users, unlike most apps and social media.

Hugin also packs some powerful decentralized P2P encrypted features like **video, voice**, **screen sharing** and **filesharing**. 

# Table of Contents

- [Table of Contents](#table-of-contents)
- [Development Resources](#development-resources)
- [Technologies](#technologies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Install & run](#install--run)
  - [Build](#build)
- [Linux development (NixOS + sfw)](#linux-development-nixos--sfw)
- [CI/CD](#cicd)
- [Contribute](#contribute)
  - [Pull Request](#pull-request)
- [Contributors](#contributors)
- [License](#license)

# Development Resources

-   Web: https://hugin.chat
-   GitHub: https://github.com/kryptokrona

# Technologies

- Node 20 (LTS)
- Electron
- Svelte
- WebRTC
- Hyperswarm

# Getting Started

## Prerequisites

- **Node 20** (LTS).
- **pnpm** — pinned to the version in the `packageManager` field of `package.json`. Any modern Node ships with corepack, which will pick that version automatically:

  ```sh
  corepack enable
  ```

Why pnpm and not npm? Two things live in the repo that assume pnpm:

- **`pnpm-lock.yaml`** is the source of truth for the dependency graph. Both PR and main CI run `pnpm install --frozen-lockfile`, so an install that resolves any other way won't merge.
- **`.npmrc`** carries `node-linker=hoisted`. Electron + native modules (`better-sqlite3-multiple-ciphers`, `uiohook-napi`, `@koush/wrtc`) need a flat, real `node_modules` — pnpm's default symlinked layout breaks `electron-builder`, `electron-rebuild`, and `node-gyp`. The `.npmrc` also pins exact versions on `pnpm add` (`save-exact=true`) so `package.json` never drifts from the lockfile.

## Install & run

|         |                    |
| ------- | ------------------ |
| Install | · `pnpm install`   |
| Develop | · `pnpm run dev`   |


## Build

|                          |                              |
|--------------------------|------------------------------|
| macOS Apple Silicon (M1) | · `pnpm run build:mac-arm64` |
| macOS Intel (x64)        | · `pnpm run build:mac-x64`   |
| Windows                  | · `pnpm run build`           |
| Linux                    | · `pnpm run build:linux-x64` |

# Linux development (NixOS + sfw)

This section is only relevant if you're developing on **NixOS** or already use
**Socket Firewall** ("sfw") to sandbox your installs. Everyone else can skip it
— a plain `pnpm install` on Ubuntu / Debian / Fedora / macOS / Windows works
without any of the below.

## The pieces

The repo ships three optional files that wire things together automatically:

| File | What it does |
|-|-|
| `flake.nix` | Nix dev shell — pins Python 3.11 (for `node-gyp`), pulls in the X11 / libudev / libxkbcommon / libusb / libxz headers the native modules need, and provides `patch-sfw`. |
| `.envrc` | direnv config — `use flake` loads the dev shell, `PATH_add ./.bin` puts the local pnpm shim first. |
| `.bin/pnpm` | Bash shim that routes every `pnpm` call through `sfw` for install-time network filtering. |

## Why sfw

Socket Firewall inspects each network call an installer makes and blocks anything
outside an allowlist. That catches the common supply-chain patterns — a compromised
transitive dep exfiltrating env vars from a `postinstall`, a typosquat pulling
down a second-stage payload, and so on — without preventing legitimate downloads
of Electron's prebuilt binaries. It's a **workstation** protection; it is
deliberately **not** enabled in CI (runners are ephemeral and CI only runs
`--frozen-lockfile`, so no ad-hoc resolutions can slip in there).

## Setup

1. Install [direnv](https://direnv.net/) and hook it into your shell.
2. Install `sfw` globally so it lives on your user PATH:

   ```sh
   npm i -g --prefix ~/.npm-global @socketsecurity/sfw
   ```

3. From the project root, allow the direnv config once:

   ```sh
   direnv allow
   ```

   direnv now enters the Nix flake dev shell on every `cd` into the repo. That
   shell exports `PYTHON=<python 3.11>` (so `node-gyp` finds distutils), puts
   sfw on `PATH`, and runs `patch-sfw` on first use.

4. Just use pnpm normally:

   ```sh
   pnpm install
   pnpm run dev
   ```

   Every `pnpm` invocation goes through `.bin/pnpm`, which strips the shim
   directory from `PATH` (to avoid infinite recursion), calls `patch-sfw` (no-op
   after the first time), then `exec sfw pnpm "$@"`. You'll see sfw's summary
   after each install.

## About `patch-sfw`

sfw ships a generic dynamically-linked Linux binary. On stock distributions the
loader lives at `/lib64/ld-linux-x86-64.so.2` and it Just Works. NixOS doesn't
have that path, so the flake provides a small `patch-sfw` script that runs
`patchelf` to repoint the loader at the Nix glibc. It's idempotent — it detects
whether the binary needs patching and self-heals whenever sfw pulls down a new
version.

## Non-Nix Linux with sfw

You don't need the Nix flake to use sfw. On Ubuntu / Debian etc. the loader is
already in place, so:

- Skip installing direnv and skip `.envrc`.
- Install sfw globally (`npm i -g @socketsecurity/sfw`).
- Prepend `sfw ` in front of your pnpm calls yourself, or symlink the `.bin/pnpm`
  shim into a directory you already put on PATH.

## Opting out entirely

None of this is required to contribute. If you'd rather skip sfw and the Nix
flake, don't run `direnv allow` and don't put `.bin/` on your PATH — `pnpm`
resolves to the real binary and everything works. `.envrc`, `.bin/`, and
`flake.nix` are inert unless you opt in.

# CI/CD

This project is automatically built, tested and deployed using GitHub Actions. We have two pipelines:

- **Main Pipeline** - This is the pipeline that runs the code merged into our main branch.
- **Pull Request Pipeline** - This is the pipeline that runs each time a pull request come in so the reviewer has some help evaluating if the code is good enough to be merged.

The Main Pipeline do everything the Pull Request Pipeline does in addition to building and publishing artifacts of different architectures and OS.

# Contribute

## Pull Request

We appreciate all contributions whether it be small changes such as documentation of source code to major improvement of code. The easiest way is to make a fork and then make a pull request into our main branch. To make the PR go through make sure to include this information:

```
What does this PR do?

Why are these changes required?

This PR has been tested using (e.g. Unit Tests, Manual Testing):

Extra details?
```

A pull request is approved if the GitHub Actions pipeline is marked green. Otherwise it will be closed directly. Always make sure to run the unit tests before creating a pull request.

# Contributors

The following contributors have either helped to start this project, have contributed
code, are actively maintaining it (including documentation), or in other ways
being awesome contributors to this project. **We'd like to take a moment to recognize them.**

[<img src="https://avatars.githubusercontent.com/u/64911460?v=4?size=72" alt="n9lsjr" width="72">](https://github.com/n9lsjr)
[<img src="https://avatars.githubusercontent.com/u/36674091?v=4?size=72" alt="Swepool" width="72">](https://github.com/Swepool)
[<img src="https://avatars.githubusercontent.com/u/33717111?v=4?size=72" alt="mjovanc" width="72">](https://github.com/mjovanc)
[<img src="https://avatars.githubusercontent.com/u/3246908?v=4?size=72" alt="f-r00t" width="72">](https://github.com/f-r00t)
[<img src="https://avatars.githubusercontent.com/u/24655747?v=4size=72" alt="appelskrutt34" width="72">](https://github.com/appelskrutt34)
[<img src="https://github.com/TechyGuy17.png?size=72" alt="TechyGuy17" width="72">](https://github.com/TechyGuy17)

# License

The license is GPL-3.0 License.
