export const colors = {
  background: '#F5F7F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F1',
  border: '#DDE5E3',
  borderStrong: '#C6D3D0',
  textPrimary: '#172321',
  textSecondary: '#5D6B68',
  textMuted: '#7C8986',
  brand: '#176B5B',
  brandStrong: '#105347',
  brandMuted: '#E3F0ED',
  statusNormal: '#287A5D',
  statusNormalMuted: '#E4F2EC',
  statusHigh: '#A6443A',
  statusHighMuted: '#F8E8E5',
  statusLow: '#996515',
  statusLowMuted: '#FAEFD9',
  focus: '#3B8275',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500' as const,
  },
} as const;

export const layout = {
  contentMaxWidth: 960,
  tabIconSize: 24,
} as const;
