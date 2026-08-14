export default function Badge({ status, size = 'md' }) {
  const base = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const styles = status === 'active'
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : 'bg-red-50 text-red-600 border border-red-200';

  const dot = status === 'active' ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${base} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}
