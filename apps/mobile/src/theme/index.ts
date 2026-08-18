export const colors = {
  background: '#F3F0E9', surface: '#FFFEFB', surfaceMuted: '#ECE8E1', surfaceSubtle: '#F8F6F1',
  border: '#DCD6CC', borderSubtle: '#EAE5DD', borderStrong: '#BEB6AA',
  textPrimary: '#18242D', textSecondary: '#46515A', textMuted: '#626A6F', textFaint: '#7F878B',
  brand: '#294B63', brandStrong: '#1E394C', brandMuted: '#E8EEF1',
  statusNormal: '#4B6258', statusNormalMuted: '#EEF2EF',
  statusHigh: '#873846', statusHighMuted: '#F5EAEC',
  statusLow: '#8A642E', statusLowMuted: '#F5EFE5', focus: '#52758C', white: '#FFFFFF',
} as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40, huge: 56 } as const;
export const radii = { xs: 3, sm: 5, md: 7, lg: 10, pill: 999 } as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '500' as const, letterSpacing: -1.05 },
  title: { fontSize: 27, lineHeight: 34, fontWeight: '500' as const, letterSpacing: -0.5 },
  value: { fontSize: 46, lineHeight: 50, fontWeight: '500' as const, letterSpacing: -1.2 },
  measurement: { fontSize: 32, lineHeight: 37, fontWeight: '500' as const, letterSpacing: -0.65 },
  measurementSmall: { fontSize: 19, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.2 },
  section: { fontSize: 18, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.15 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600' as const, letterSpacing: 0.15 },
  metadata: { fontSize: 10, lineHeight: 15, fontWeight: '600' as const, letterSpacing: 1.35, textTransform: 'uppercase' as const },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },
} as const;

export const breakpoints = { compact: 640, desktop: 1024 } as const;
export const layout = {
  contentMaxWidth: 1260,
  supportingRailWidth: 350,
  desktopGutter: 40,
  mobileGutter: 16,
  tabIconSize: 24,
} as const;
