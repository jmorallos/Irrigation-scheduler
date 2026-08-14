import { generateInitials, getLogoColor } from '../utils/logoUtils';

export default function ProgramLogo({ name, size = 'md' }) {
  const { bg, text } = getLogoColor(name);
  const initials = generateInitials(name);
  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size];

  return (
    <div
      className={`${sizeClass} rounded-xl font-bold flex items-center justify-center flex-shrink-0 select-none`}
      style={{ backgroundColor: bg, color: text }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
