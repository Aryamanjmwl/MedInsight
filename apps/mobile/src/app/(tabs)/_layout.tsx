import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, typography } from '@/theme';

type TabIconProps = {
  name: keyof typeof Feather.glyphMap;
  color: ColorValue;
  focused: boolean;
};

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tabIcon,
        {
          borderColor: color,
          backgroundColor: focused ? colors.brandMuted : colors.surface,
        },
      ]}>
      <Feather color={color} name={name} size={19} />
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
          tabBarIcon: (props) => <TabIcon name="home" {...props} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: (props) => <TabIcon name="file-text" {...props} />,
        }}
      />
      <Tabs.Screen
        name="biomarkers"
        options={{
          title: 'Biomarkers',
          tabBarIcon: (props) => <TabIcon name="activity" {...props} />,
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: 'Brief',
          tabBarIcon: (props) => <TabIcon name="clipboard" {...props} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: (props) => <TabIcon name="settings" {...props} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingTop: 7,
    paddingBottom: 7,
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabLabel: {
    ...typography.caption,
  },
  tabIcon: {
    width: 30,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    borderRadius: radii.xs,
  },
});
