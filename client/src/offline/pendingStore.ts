type Listener = () => void;

const listeners = new Set<Listener>();

/** Avisa a quien esté escuchando (ej. el indicador de "N cambios pendientes") que la cola cambió. */
export function notifyQueueChanged() {
  listeners.forEach((l) => l());
}

export function subscribeQueueChanged(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
