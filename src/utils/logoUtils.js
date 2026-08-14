const LOGO_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#cffafe', text: '#0e7490' },
  { bg: '#e8f0fe', text: '#1a3a7a' },
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#f0f9ff', text: '#0369a1' },
  { bg: '#ecfeff', text: '#155e75' },
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
