export default function PageError({ message, onRetry }) {
  return (
    <div className="py-16 text-center px-4">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium text-brand-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
