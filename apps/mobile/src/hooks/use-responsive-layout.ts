import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  return { width, isCompact: width < breakpoints.compact, isDesktop: width >= breakpoints.desktop };
}
