---
---

## What it does

- Shows a small **phone** or **PC** symbol at the avatar's status indicator.
- The device symbol is tinted with that device session's Discord status: **green** for online, **yellow** for idle, and **red** for Do Not Disturb.
- When both phone and desktop sessions are present, it shows both device symbols with their own status colors.
- When Discord does not provide enough information to identify the device, the original Discord status indicator remains unchanged. Offline/invisible users therefore keep Discord's normal gray indicator.
- A web-only session is treated as unknown rather than guessed as a phone or PC.

## Build

From the `Unbound` workspace root:

```sh
bun install
bun run build
```
