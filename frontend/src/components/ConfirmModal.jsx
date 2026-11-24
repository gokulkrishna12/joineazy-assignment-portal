import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm Delete',
  cancelText = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="confirm-modal-danger relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/15 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                Action Required
              </span>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700">
          {message}
        </p>

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="btn-danger-sheen inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            {busy ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}