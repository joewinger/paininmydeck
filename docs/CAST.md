# TV mode and Google Cast

## Current status

The universal TV route is implemented. Google Cast/Chromecast integration is **not yet implemented**.

Open `/tv/:roomId` on a laptop or TV browser to get the read-only party display. It shows a large QR code for `/join/:roomId` and keeps the room's public chat, leaderboard, and latest completed-round receipt visible. The route uses the display-only watch capability documented in [`ARCHITECTURE.md`](../ARCHITECTURE.md); it never joins as a player or receives private player state.

Desktop Chrome can also mirror this route with its built-in tab-casting command. That is a browser feature, not an application-managed Cast session.

## Future Cast implementation

The supported application-managed path is a Cast Application Framework (CAF) Web Sender paired with a registered Custom Web Receiver:

1. Add the CAF Web Sender and Cast launcher to the existing game page.
2. Register a Custom Web Receiver and configure its application ID in the sender.
3. Host the receiver as a small HTTPS HTML5 application that reuses the TV presentation.
4. After the sender launches the receiver, pass only the room bootstrap and a short-lived display capability over a custom Cast namespace.
5. Have the receiver connect to the existing watch API and read-only snapshot stream.

The sender must never send or expose `__Host-pid_session`. The receiver gets only a short-lived, room-scoped display capability and must remain unable to issue player commands. The registered receiver URL is application-wide; room selection is bootstrap data sent after the receiver launches.

The MVP network contract is sender and receiver on the same Wi-Fi. Guest networks, access-point isolation, VPNs, and firewalls can prevent Cast discovery and must produce a clear fallback to opening `/tv/:roomId` directly. Relay casting is outside the MVP.

Google documents the Web Sender SDK for Cast-supported desktop browsers and Android devices. Android Chrome is the supported mobile-web sender target. Google explicitly says casting is not supported in Chrome on iOS, so an iPhone-hosted Cast flow would require a future native iOS sender; the web TV route remains the iOS fallback.

Both the production Web Sender page and published Custom Web Receiver must use HTTPS. A Custom Web Receiver must be registered to receive an application ID. During development, physical Cast devices must be registered for testing; publishing makes the receiver available to ordinary Cast devices.

## Official references

- [Web Sender setup, platforms, and HTTPS](https://developers.google.com/cast/docs/web_sender)
- [Web Sender integration and receiver application ID](https://developers.google.com/cast/docs/web_sender/integrate)
- [Web Receiver choices](https://developers.google.com/cast/docs/web_receiver)
- [Custom Web Receiver hosting and lifecycle](https://developers.google.com/cast/docs/web_receiver/basic)
- [Custom message namespaces](https://developers.google.com/cast/docs/web_receiver/core_features)
- [Application and test-device registration](https://developers.google.com/cast/docs/registration)
- [Device discovery and same-Wi-Fi troubleshooting](https://developers.google.com/cast/docs/discovery)
- [Chrome tab casting](https://support.google.com/googlecast/answer/3228332)
