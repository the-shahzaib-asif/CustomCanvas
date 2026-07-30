// theme.ts
// Central place for all colors, spacing, sizing.
// Change brand color here once — whole app updates.

export const colors = {
  primary: '#F0592A',        // Bookme brand orange
  primaryDark: '#D8481E',
  primaryLight: '#FDE9E1',

  background: '#F1F3F8',     // slightly cooler gray background
  surface: '#FFFFFF',
  sidebarBg: '#1A1D29',

  border: '#E5E7EB',
  borderDark: '#334155',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textOnDark: '#E2E8F0',
  textMuted: '#94A3B8',

  // Table colors — dark elegant table instead of bright orange
  tableFill: '#2D3142',       // dark navy-ish table body
  tableBorder: '#3D4255',     // subtle border around the table
  chairFill: '#F0592A',       // chairs use brand orange as accent
  chairBorder: '#D8481E',     // darker orange border on chairs

  danger: '#EF4444',
  success: '#10B981',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const sizes = {
  sidebarWidth: 76,
  shapeBase: 64,
  minScale: 0.6,
  maxScale: 2,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};