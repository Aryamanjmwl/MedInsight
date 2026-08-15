import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme';

type TextVariant = keyof typeof typography;
type TextColor = keyof typeof colors;

type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: TextColor;
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[styles.base, typography[variant], { color: colors[color] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
  },
});
