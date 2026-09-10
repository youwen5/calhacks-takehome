{
  description = "Cal Hacks Portal: one Node application, persistent SQLite, Nix-built OCI image";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      eachSystem = nixpkgs.lib.genAttrs systems;
    in {
      devShells = eachSystem (system:
        let pkgs = import nixpkgs { inherit system; }; in {
          default = pkgs.mkShell {
            packages = with pkgs; [ nodejs_24 pnpm python3 gnumake gcc sqlite chromium ];
            PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium";
          };
        });
      packages = eachSystem (system:
        let
          pkgs = import nixpkgs { inherit system; };
          nodejs = pkgs.nodejs_24;
          pnpm = pkgs.pnpm;
          src = pkgs.lib.cleanSourceWith {
            src = ./.;
            filter = path: type:
              let name = baseNameOf path;
              in !(builtins.elem name [ ".git" "node_modules" ".svelte-kit" "data" "build" "dist" "test-results" "playwright-report" "result" ".env" ])
                && !(pkgs.lib.hasPrefix "result-" name)
                && (!(pkgs.lib.hasPrefix ".env." name) || name == ".env.example");
          };
          app = pkgs.stdenv.mkDerivation (final: {
            pname = "calhacks-portal";
            version = "0.1.0";
            inherit src;
            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (final) pname version src;
              inherit pnpm;
              fetcherVersion = 4;
              hash = "sha256-RprBUxY7XhHj/TCYs6Ta4XhVCf/4CnwG6k3wLp/7Bk4=";
            };
            nativeBuildInputs = [ nodejs pnpm pkgs.pnpmConfigHook pkgs.python3 pkgs.pkg-config ];
            npm_config_nodedir = "${nodejs}";
            npm_config_build_from_source = "true";
            buildPhase = ''
              runHook preBuild
              pnpm rebuild
              pnpm exec svelte-kit sync
              pnpm check
              pnpm test
              pnpm build
              pnpm exec esbuild scripts/migrate.ts scripts/admin.ts scripts/backup.ts --bundle --platform=node --format=esm --packages=external --outdir=dist --out-extension:.js=.mjs
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              pnpm prune --prod --ignore-scripts
              mkdir -p $out/app
              cp -r build dist drizzle package.json node_modules $out/app/
              runHook postInstall
            '';
          });
          server = pkgs.writeShellScriptBin "calhacks-portal" ''
            set -eu
            export NODE_ENV=production
            export HOST=0.0.0.0
            export PORT="''${PORT:-3000}"
            export BODY_SIZE_LIMIT=65536
            export DATABASE_PATH="''${DATABASE_PATH:-/data/portal.db}"
            export MIGRATIONS_DIR=${app}/app/drizzle
            ${nodejs}/bin/node ${app}/app/dist/migrate.mjs
            exec ${nodejs}/bin/node ${app}/app/build
          '';
          adminCommand = pkgs.writeShellScriptBin "calhacks-admin" ''
            export DATABASE_PATH="''${DATABASE_PATH:-/data/portal.db}"
            exec ${nodejs}/bin/node ${app}/app/dist/admin.mjs "$@"
          '';
          backupCommand = pkgs.writeShellScriptBin "calhacks-backup" ''
            export DATABASE_PATH="''${DATABASE_PATH:-/data/portal.db}"
            exec ${nodejs}/bin/node ${app}/app/dist/backup.mjs "$@"
          '';
          runner = pkgs.symlinkJoin { name = "calhacks-commands"; paths = [ server adminCommand backupCommand ]; };
        in {
          default = app;
          inherit app runner;
          docker-image = pkgs.dockerTools.buildLayeredImage {
            name = "calhacks-portal";
            tag = "local";
            contents = [ pkgs.cacert ];
            extraCommands = ''mkdir -p data tmp; chmod 1777 tmp; chmod 0777 data'';
            config = {
              Cmd = [ "${runner}/bin/calhacks-portal" ];
              WorkingDir = "/data";
              User = "10001:10001";
              ExposedPorts."3000/tcp" = { };
              Volumes."/data" = { };
              Env = [ "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt" "PATH=${nodejs}/bin:${runner}/bin" ];
            };
          };
        });
      checks = eachSystem (system: { application = self.packages.${system}.app; });
    };
}
