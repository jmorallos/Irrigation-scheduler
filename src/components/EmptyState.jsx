export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-xl bg-surface-alt flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-black" />
      </div>
      <h3 className="text-sm font-semibold text-navy-900 mb-1">{title}</h3>
      <p className="text-sm text-black max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
