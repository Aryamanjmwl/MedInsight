import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, layout, radii, typography } from '@/theme';

type TabIconProps = {
  label: string;
  color: ColorValue;
  focused: boolean;
};

function TabIcon({ label, color, focused }: TabIconProps) {
  return (
    <View
      style={[
        styles.tabIcon,
        {
          borderColor: color,
          backgroundColor: focused ? colors.brandMuted : colors.surface,
        },
      ]}>
      <Text style={[styles.tabIconText, { color }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isDesktop } = useResponsiveLayout();
  return (
    <Tabs
      tabBar={isDesktop ? () => null : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: (props) => <TabIcon label="D" {...props} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: (props) => <TabIcon label="R" {...props} />,
        }}
      />
      <Tabs.Screen
        name="biomarkers"
        options={{
          title: 'Biomarkers',
          tabBarIcon: (props) => <TabIcon label="B" {...props} />,
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: 'Brief',
          tabBarIcon: (props) => <TabIcon label="V" {...props} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: (props) => <TabIcon label="S" {...props} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabLabel: {
    ...typography.caption,
  },
  tabIcon: {
    width: layout.tabIconSize,
    height: layout.tabIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  tabIconText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
