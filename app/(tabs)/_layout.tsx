import { Tabs } from "expo-router";
import React from "react";
import { Home, Trophy, User, Search, Camera } from "lucide-react-native";
import AuthGuard from "@/components/AuthGuard";

export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#2E7D32",
          tabBarInactiveTintColor: "#8D6E63",
          headerShown: true,
          tabBarStyle: {
            backgroundColor: "#FFFDE7",
            height: 80,
            paddingBottom: 10,
          },
          headerStyle: {
            backgroundColor: "#2E7D32",
          },
          headerTintColor: "#fff",
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarIcon: ({ color }) => (
            <Camera 
              color="#fff" 
              size={28}
              style={{
                backgroundColor: '#2E7D32',
                padding: 16,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: '#fff',
              }}
            />
          ),
          tabBarIconStyle: {
            marginBottom: 10,
          },
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: "Achievements",
          tabBarIcon: ({ color }) => <Trophy color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          href: null,
        }}
      />
      </Tabs>
    </AuthGuard>
  );
}