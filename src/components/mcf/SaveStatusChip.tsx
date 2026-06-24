export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveStatusChip({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border">
        <span className="h-1.5 w-1.5 rounded-full bg-neutral-500 animate-pulse" />
        Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300">
        ✓ Saved
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
    >
      ✕ Retry save
    </button>
  );
}