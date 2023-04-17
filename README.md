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

Hugin is a messaging service where messages are relayed by Kryptokrona nodes. Your messages are secured with industry leading encryption so that only you and your chat partner have the possibility to read them. **The purpose** is **not** to gather any personal information about the users, unlike most apps and social media.

Hugin also packs some powerful decentralized P2P encrypted features like **video, voice**, **screen sharing** and **filesharing**. This is possible because we've managed to compress the requests to establish a connection (called SDP) with WebRTC from over 2000 characters to less than 200 – which means that a connection through Hugin is possible!

# Table of Contents

- [Table of Contents](#table-of-contents)
- [Development Resources](#development-resources)
- [Technologies](#technologies)
- [Getting Started](#getting-started)
  - [Build](#build)
- [CI/CD](#cicd)
- [Contribute](#contribute)
  - [Pull Request](#pull-request)
- [Contributors](#contributors)
- [License](#license)

# Development Resources

-   Web: https://hugin.chat
-   GitHub: https://github.com/kryptokrona
-   Hugin: hugin group on `20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8` 
-   It is HIGHLY recommended to join our group on Hugin Messenger if you want to contribute to stay up to date on what is happening on the project.

# Technologies

- Node 16 (16.16.0 currently)
- Electron
- Svelte
- WebRTC
- Hypercore Protocol

# Getting Started

> \*Feel free to substitute `npm` with `pnpm` or `yarn`.

|         |                   |
| ------- | ----------------- |
| Install | · `npm install`   |
| Develop | · `npm run dev`   |


## Build
To build a target we have the following options:


|                          |                             |
|--------------------------|-----------------------------|
| macOS Apple Silicon (M1) | · `npm run build:mac-arm64` |
| macOS Intel (x64)        | · `npm run build:mac-x64`   |
| Windows                  | · `npm run build`           |
| Linux                    | · `npm run build:linux-x64` |

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
[<img src="https://github.com/appelskrutt34.png?size=72" alt="appelskrutt34" width="72">](https://github.com/appelskrutt34)

# License

The license is GPL-3.0 License.
