# Unbound Addons

This folder is a separate Unbound workspace. The legacy Enmity addons remain outside it.

## Build

Install [Bun](https://bun.sh), then run:

```sh
cd Unbound
bun install
bun run build
```

The Device Detector addon is in `plugins/device-detector`. Its build output is written to `Unbound/dist`.

## Development

```sh
cd Unbound
bun run dev
```

See the [Unbound plugin documentation](https://docs.unbound.rip/plugins/introduction) for the current API and development workflow.
