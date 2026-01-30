import { X } from "lucide-react";

function ConfirmModal({
  title,
  message,
  confirmText = "Confirm",
  onConfirm,
  onCancel
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-80 p-4 relative">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3"
        >
          <X size={16} />
        </button>

        <h3 className="font-semibold text-center mb-2">
          {title}
        </h3>

        <p className="text-sm text-neutral-600 text-center mb-4">
          {message}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2 rounded"
          >
            {confirmText}
          </button>

          <button
            onClick={onCancel}
            className="flex-1 border py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
