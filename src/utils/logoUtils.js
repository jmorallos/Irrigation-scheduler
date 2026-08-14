const LOGO_COLORS = [
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#cffafe', text: '#155e75' },
  { bg: '#f0fdf4', text: '#14532d' },
];

export function generateInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function getLogoColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}
