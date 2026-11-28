export default function DeleteModal({
  isOpen,
  title = 'Confirm Delete',
  subtitle = 'This action cannot be undone.',
  message,
  confirmLabel = 'Delete',
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay" onClick={!loading ? onCancel : undefined}>
      <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon" aria-hidden="true">
            🗑
          </div>
          <div>
            <h3 className="delete-modal-title">{title}</h3>
            <p className="delete-modal-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="delete-modal-body">{message}</div>

        <div className="delete-modal-actions">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="delete-btn-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="delete-btn-confirm"
          >
            {loading ? (
              <>
                <span className="filter-rotate-sm" />
                Deleting...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}