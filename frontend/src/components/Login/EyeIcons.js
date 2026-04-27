// Elegant SVG icons for eye open/closed
export function EyeOpen({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9a8b7e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="9" ry="5.5" />
      <circle cx="12" cy="12" r="2.5" fill="#9a8b7e" />
    </svg>
  );
}

export function EyeClosed({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#9a8b7e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="9" ry="5.5" />
      <circle cx="12" cy="12" r="2.5" fill="#9a8b7e" />
      <line x1="4" y1="20" x2="20" y2="4" stroke="#c6a969" strokeWidth="2.5" />
    </svg>
  );
}
