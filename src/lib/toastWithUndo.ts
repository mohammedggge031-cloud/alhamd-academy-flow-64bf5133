import { toast } from "sonner";

/**
 * Shows a toast with an Undo button. The `commit` function runs after the delay
 * unless the user clicks Undo. Ideal for soft-cancel of destructive operations
 * where the actual mutation is deferred a few seconds.
 *
 * Usage:
 *   toastWithUndo({
 *     message: "تم حذف الطالب",
 *     commit: async () => { await supabase.from("students").delete().eq("id", id); qc.invalidate() },
 *     onUndo: () => { /* restore local UI *\/ },
 *   });
 */
export function toastWithUndo(opts: {
  message: string;
  commit: () => void | Promise<void>;
  onUndo?: () => void;
  delayMs?: number;
  undoLabel?: string;
}) {
  const delay = opts.delayMs ?? 6000;
  let undone = false;
  const timer = setTimeout(() => {
    if (!undone) {
      void Promise.resolve(opts.commit()).catch(() => {
        toast.error("فشلت العملية");
      });
    }
  }, delay);

  toast(opts.message, {
    duration: delay,
    action: {
      label: opts.undoLabel ?? "تراجع",
      onClick: () => {
        undone = true;
        clearTimeout(timer);
        opts.onUndo?.();
        toast.success("تم التراجع");
      },
    },
  });
}
