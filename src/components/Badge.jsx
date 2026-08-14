export default function Badge({ status, size = 'md' }) {
  const base = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  const styles = status === 'active'
    ? 'bg-green-50 text-green-700 border border-green-200'
    : 'bg-gray-100 text-gray-500 border border-gray-200';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${base} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}
