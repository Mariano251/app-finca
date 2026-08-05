import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      style={{
        background: "var(--color-danger)",
        color: "white",
        textAlign: "center",
        padding: "0.4rem",
        fontSize: "0.82rem",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      Sin conexión — la app sigue abierta, pero los datos pueden no estar actualizados hasta que
      vuelva la red.
    </div>
  );
}
