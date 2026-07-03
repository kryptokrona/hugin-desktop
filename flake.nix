{
  description = "hugin-desktop dev shell — makes Socket Firewall (sfw) runnable on NixOS";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      # Socket Firewall ships a generic, dynamically-linked Linux binary (pulled
      # into ~/.npm-global/.../.sfw-cache on first run). NixOS has no
      # /lib64/ld-linux, so the binary won't start as-is. patch-sfw repoints it
      # at the Nix glibc loader + runtime libs. The grep guard makes it a no-op
      # once a binary is already patched, so it is safe to run on every invocation
      # and self-heals whenever sfw downloads a new version.
      loader = "${pkgs.glibc.out}/lib/ld-linux-x86-64.so.2";
      rpath = pkgs.lib.makeLibraryPath [ pkgs.glibc pkgs.stdenv.cc.cc.lib ];

      patch-sfw = pkgs.writeShellScriptBin "patch-sfw" ''
        set -euo pipefail
        shopt -s nullglob
        for b in "$HOME"/.npm-global/lib/node_modules/sfw/.sfw-cache/*/sfw-*; do
          [ -f "$b" ] || continue
          if ${pkgs.patchelf}/bin/patchelf --print-interpreter "$b" 2>/dev/null | grep -q '^/lib'; then
            ${pkgs.patchelf}/bin/patchelf \
              --set-interpreter "${loader}" \
              --set-rpath "${rpath}" "$b" \
              && echo "hugin-desktop: patched sfw for NixOS ($(basename "$b"))"
          fi
        done
      '';
    in {
      devShells.${system}.default = pkgs.mkShell {
        # node-gyp (used to build better-sqlite3-multiple-ciphers) needs Python
        # with distutils, removed in Python 3.12+. Pin 3.11 so native builds work
        # regardless of the system Python.
        packages = [ pkgs.patchelf patch-sfw pkgs.python311 ];

        nativeBuildInputs = [ pkgs.pkg-config ];

        # System libs the various native modules need to compile on Linux.
        # buildInputs puts their headers/libs on NIX_CFLAGS_COMPILE / NIX_LDFLAGS.
        #   X11 set + libxkbcommon -> uiohook-napi (global input hooks)
        #   systemd (libudev) + libusb1 -> usb, node-hid
        #   xz (liblzma)               -> lzma-native
        buildInputs = (with pkgs.xorg; [ libX11 libXtst libXt libXinerama libXrandr ])
          ++ [ pkgs.libxkbcommon pkgs.systemd pkgs.libusb1 pkgs.xz ];
        shellHook = ''
          # Point node-gyp at the distutils-capable Python.
          export PYTHON="${pkgs.python311}/bin/python3"
          export npm_config_python="${pkgs.python311}/bin/python3"

          # Electron 30's v8 headers (~/.electron-gyp/30.5.1/include/node) use
          # C++17 features (std::string_view, std::optional, std::is_void_v,
          # std::void_t, etc.) but several binding.gyp files in our dep tree
          # (usb, hugin-utils, kryptokrona-crypto) don't specify a C++ standard.
          # gyp then defaults to c++11/14 and the headers won't parse under
          # NixOS gcc 15+. Force c++17 globally so the rebuild step compiles
          # cleanly. `gnu++17` (over `c++17`) keeps GNU extensions enabled,
          # which some of these older binding.gyp files rely on.
          export CXXFLAGS="-std=gnu++17 ''${CXXFLAGS:-}"

          # Put the user-global sfw binary on PATH and make sure it is patched.
          export PATH="$HOME/.npm-global/bin:$PATH"
          patch-sfw || true
        '';
      };
    };
}
