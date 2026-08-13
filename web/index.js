import { registerRootComponent } from "expo";

import App from "./src/App";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("trade-tool-")).map((name) => caches.delete(name)));
    }
  });
}

registerRootComponent(App);
