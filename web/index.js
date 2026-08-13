import { registerRootComponent } from "expo";

import App from "./src/App";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const registration = await navigator.serviceWorker.register("./service-worker.js", {
      updateViaCache: "none",
    });
    await registration.update();
  });
}

registerRootComponent(App);
