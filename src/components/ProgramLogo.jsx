import { generateInitials, getLogoColor } from '../utils/logoUtils';
import { useProfileImage } from '../hooks/useProfileImage';

export default function ProgramLogo({ name, profileImageId, size = 'md', square = false }) {
  const { url, loading } = useProfileImage(profileImageId);
  const { bg, text } = getLogoColor(name);
  const initials = generateInitials(name);
  const radius = square ? 'rounded-none' : 'rounded-xl';
  const border = square ? '' : 'border border-slate-200';

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    fill: 'w-full h-full text-xl',
  }[size];

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${sizeClass} ${radius} object-cover flex-shrink-0 ${border} ${loading ? 'opacity-70' : ''}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${radius} font-bold flex items-center justify-center flex-shrink-0 select-none ${border}`}
      style={{ backgroundColor: bg, color: text }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
