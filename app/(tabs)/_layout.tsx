import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/theme/tokens';

type TabIconName = 'home' | 'search' | 'heart' | 'settings' | 'moon' | 'list';

function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: TabIconName;
  color: string;
  focused: boolean;
}) {
  const iconMap: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
    home: focused ? 'home' : 'home-outline',
    search: focused ? 'search' : 'search-outline',
    heart: focused ? 'heart' : 'heart-outline',
    settings: focused ? 'settings' : 'settings-outline',
    moon: focused ? 'moon' : 'moon-outline',
    list: focused ? 'list' : 'list-outline',
  };

  return <Ionicons name={iconMap[name]} size={22} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: colors.gray[600],
        tabBarStyle: {
          backgroundColor: colors.gray[950],
          borderTopColor: colors.gray[900],
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 6,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          fontFamily: fontFamily.regular,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="heart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="list" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
