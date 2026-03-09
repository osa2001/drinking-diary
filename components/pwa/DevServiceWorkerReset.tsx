"use client";

import { useEffect } from "react";

export function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    const isLocalhost =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocalhost) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    }

    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          void caches.delete(key);
        });
      });
    }
  }, []);

  return null;
}
