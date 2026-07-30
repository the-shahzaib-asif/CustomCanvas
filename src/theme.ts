// theme.ts
export const colors = {
  primary: '#F0592A',
  primaryDark: '#D8481E',
  primaryLight: '#FDE9E1',

  background: '#F1F3F8',
  workspaceBg: '#C9CEDA',   // darker gray — the "infinite void" outside the floor
  surface: '#FFFFFF',
  sidebarBg: '#1A1D29',

  border: '#E5E7EB',
  borderDark: '#334155',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textOnDark: '#E2E8F0',
  textMuted: '#94A3B8',

  tableFill: '#2D3142',
  tableBorder: '#3D4255',
  chairFill: '#F0592A',
  chairBorder: '#D8481E',

  danger: '#EF4444',
  success: '#10B981',
  gridDot: '#D1D5DB',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const sizes = {
  sidebarWidth: 72,
  shapeBase: 64,

  minScale: 0.6,
  maxScale: 2,

  canvasMinZoom: 0.2,
  canvasMaxZoom: 2.5,

  // How far the camera can pan past the floor's edge before hard-stopping.
  // Gives a "Miro-style" soft overscroll instead of feeling stuck.
  panOverscroll: 250,

  // Pixels-per-foot conversion used when the user sets floor dimensions in feet.
  pixelsPerFoot: 15,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};