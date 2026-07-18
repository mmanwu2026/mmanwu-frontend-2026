export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "sw-update") {
        window.dispatchEvent(new Event("sw-update"));
      }
    });
  }
}
