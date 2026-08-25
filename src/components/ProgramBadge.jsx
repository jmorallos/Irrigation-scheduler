import { getProgramTheme } from '../utils/programColors';

export default function ProgramBadge({ code, color, size = 'md' }) {
  const theme = getProgramTheme({ controller_program: code, color });
  const sizeClass = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }[size];

  return (
    <span
      className={`${sizeClass} ${theme.badge} rounded font-bold flex items-center justify-center flex-shrink-0 select-none`}
      style={{
        backgroundColor: theme.badgeHex,
        color: theme.badgeTextHex || undefined,
      }}
      aria-hidden="true"
    >
      {theme.letter || '—'}
    </span>
  );
}
