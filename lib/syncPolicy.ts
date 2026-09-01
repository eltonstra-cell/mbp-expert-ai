export const SYNC_ACTIVATION_DEDUP_MS = 3000;

type ActivationSyncInput = {
  ready: boolean;
  visible: boolean;
  now: number;
  lastSyncAt: number;
  minIntervalMs?: number;
};

export function shouldSyncOnActivation({
  ready,
  visible,
  now,
  lastSyncAt,
  minIntervalMs = SYNC_ACTIVATION_DEDUP_MS,
}: ActivationSyncInput) {
  if (!ready || !visible) return false;
  return now - lastSyncAt >= minIntervalMs;
}
