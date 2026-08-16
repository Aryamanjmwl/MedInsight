export const colors = {
  background: '#EDEAE5', surface: '#FAFAF8', surfaceMuted: '#F4F1ED', surfaceSubtle: '#F7F5F2',
  border: '#E2DDD8', borderSubtle: '#EDEBE7', borderStrong: '#C9C2BB',
  textPrimary: '#1A1714', textSecondary: '#4A4542', textMuted: '#7A7672', textFaint: '#A39D97',
  brand: '#2B4870', brandStrong: '#203957', brandMuted: '#EDF1F7',
  statusNormal: '#4A4542', statusNormalMuted: '#F4F1ED',
  statusHigh: '#922030', statusHighMuted: '#F6ECEE',
  statusLow: '#94651A', statusLowMuted: '#F6F0E4', focus: '#496A93', white: '#FFFFFF',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40, huge: 56 } as const;
export const radii = { xs: 4, sm: 6, md: 8, lg: 10, pill: 999 } as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '500' as const, letterSpacing: -0.7 },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '500' as const, letterSpacing: -0.35 },
  value: { fontSize: 44, lineHeight: 48, fontWeight: '500' as const, letterSpacing: -1 },
  section: { fontSize: 17, lineHeight: 23, fontWeight: '500' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const, letterSpacing: 0.2 },
  metadata: { fontSize: 11, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '400' as const },
} as const;

export const breakpoints = { compact: 640, desktop: 1024 } as const;
export const layout = {
  contentMaxWidth: 1240,
  supportingRailWidth: 360,
  desktopGutter: 40,
  mobileGutter: 16,
  tabIconSize: 24,
} as const;
