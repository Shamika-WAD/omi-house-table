# Deployment, installation, and troubleshooting

## Requirements

- Node.js 22 recommended (`.nvmrc` is included).
- npm and a long-running web service supporting WebSockets / Socket.IO.
- **One running instance** for the in-memory room implementation.
- HTTPS for internet deployment and phone installation.

No database, API key, external frontend host, or environment secret is required. This does not make room state durable: server restarts still reset games.

## Render

The current public game is **https://omi-the-house-table.onrender.com/**.

Connect the repository as a **Web Service**, not a static site. Keep these files at the repository root: `package.json`, `package-lock.json`, `server.js`, `game.js`, and `public/`.

| Setting | Value |
|---|---|
| Runtime | Node |
| Build | `npm ci --omit=dev` |
| Start | `npm start` |
| Health check | `/health` |
| Instances | 1 |
| NODE_ENV | production |
| NODE_VERSION | 22 |

The server accepts the host’s `PORT` and binds to `0.0.0.0`. A `render.yaml` blueprint is supplied as an alternative to manual configuration. It requests a free plan; confirm the host’s current availability, billing, idle-sleep, and connection policies yourself. Change the plan if appropriate.

After pushing an update, wait for the deployment to finish. If auto-deploy is disabled, manually deploy the latest commit. Avoid deployments during games because rooms are not saved.

**GitHub Pages alone cannot host this game:** it cannot run the required Node.js multiplayer service. GitHub holds the source; Render or another Node.js host runs it.

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP and Socket.IO listening port | `3000` |
| `NODE_ENV` | Standard runtime environment | Set `production` on your host |

There is no frontend API hostname to configure. Browser code uses the same origin as the website, which also makes local and proxied deployments work.

## Docker

```sh
docker build -t omi-house-table .
docker run --rm -p 3000:3000 omi-house-table
```

Open `http://localhost:3000`. The container uses Node.js 22 and runs as a non-root user. Place it behind HTTPS for phone installation over the internet. Run only one instance; container restarts lose rooms.

## Same-Wi-Fi development

1. Run `npm ci` and `npm start` on the laptop.
2. Find its LAN IP with `ipconfig` on Windows or network settings on macOS/Linux.
3. Open, for example, `http://192.168.1.25:3000` on the host phone.
4. Allow Node.js / port 3000 through the laptop firewall on private networks.
5. Create the room through that LAN URL so the QR code uses an address the other phones can reach.

Replace the example IP. `localhost` on a phone means the phone itself, not the laptop. Guest Wi-Fi may block device-to-device traffic. Do not expose your home router solely to play; an HTTPS-hosted service is simpler.

Local HTTP can block clipboard functionality, for which the app has a copy-prompt fallback. Plain LAN HTTP generally does not support service-worker/PWA installation; use the hosted HTTPS URL for that. `localhost` on the development computer is a special secure-context exception.

## Install on Android

1. Open the HTTPS website in Chrome, not an embedded messaging-app browser.
2. Tap Omi’s Install suggestion and confirm the browser prompt if offered.
3. Alternatively, open **⋮ → Install app / Add to Home screen** and follow the prompts.
4. Launch Omi from the new icon.

The browser controls installation eligibility and prompt timing. If Omi’s Install button cannot trigger a native prompt, it displays manual instructions. Dismissing Omi’s suggestion hides it for seven days; the browser menu remains available.

## Install on iPhone / iPad

1. Open the HTTPS website in Safari.
2. Tap **Share** (square with an arrow).
3. Select **Add to Home Screen**; scroll through actions if necessary.
4. Leave **Open as Web App** enabled if your iOS version shows it, then tap **Add**.
5. Launch the home-screen icon.

Safari does not provide Chrome’s programmatic installation prompt. The site can show directions, but cannot silently install itself. Menus vary by OS/browser version.

Install before creating a table and use the installed window consistently. Browser tabs and installed windows may have different session storage. Home-screen installation does not add persistent accounts or cross-window seat recovery.

## PWA caching and updates

- `manifest.webmanifest` defines app name, scope, standalone mode, and regular/maskable icons.
- `start_url` is `/`; installing does not permanently pin a private room code.
- `sw.js` caches only the public offline-help page and public icons.
- Navigations try the network first and use offline help after network failure.
- Game scripts, game state, hands, credentials, QR endpoints, and Socket.IO traffic are not stored by the worker. Normal HTTP caching is still controlled by server response headers.
- Offline installation support is **not offline multiplayer**. All four seats need a reachable live server.
- Worker updates wait rather than force-reloading an active table. Close all Omi windows and reopen to activate a waiting version. Change the cache version in `sw.js` when changing cached offline resources.

## Troubleshooting

### My update is not visible

Confirm the correct GitHub branch and latest commit were deployed. Refresh the browser. On a computer, try a hard refresh; on a phone, close and reopen the browser/app window. Clear site data only as a last resort—it can remove your seat credentials. A worker update may wait until all Omi windows close.

### No Install option

Use the full HTTPS website in Chrome on Android or Safari on iPhone. Check that `/manifest.webmanifest`, `/sw.js`, and the icon URLs load successfully. Previously installed/dismissed apps, embedded browsers, private browsing, browser policy, and device versions can affect the prompt. Use the manual home-screen instructions above.

### The site takes time to open

Your hosting plan may sleep while idle. Wait for it to wake and try again. Consult the host’s logs and health check rather than repeatedly creating rooms.

### A player disconnected or cannot recover a seat

Reopen/refresh the same original browser/app window. Switching browsers, closing the original window, clearing storage, or a server restart can lose the session. The game pauses for disconnected seats. If a player cannot recover, create a new room; bots and seat substitution are not implemented.

### QR code opens the wrong address

Create the room using the URL everyone should join. Do not create a local room at `localhost` and expect its QR code to reach a laptop from other phones.

### Multiple server instances cannot find the same room

Use one instance. A future multi-instance deployment must add shared room state and Socket.IO routing/adapter support.

## Operational boundaries

Room codes are unlisted invitations, not authentication passwords; anyone with the code can open the shared display. Keep invitations private. This is a small private-game service, not a security-audited public gaming platform. Plan durable recovery, stronger abuse controls, monitoring, and device/accessibility testing before broad public deployment.
