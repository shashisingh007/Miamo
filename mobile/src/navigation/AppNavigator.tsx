// Miamo Mobile — Root navigator.
// Structure mirrors the web (main) layout: 5 bottom tabs (Discover, Matches,
// Messages, Creativity, Profile) + a stack for detail screens that overlay
// the tabs (Chat, Onboarding, Auth, DTM sub-routes, etc.).
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AuthScreen from '@screens/AuthScreen';
import OnboardingScreen from '@screens/OnboardingScreen';
import DiscoverScreen from '@screens/DiscoverScreen';
import MatchesScreen from '@screens/MatchesScreen';
import MessagesScreen from '@screens/MessagesScreen';
import ChatScreen from '@screens/ChatScreen';
import DtmScreen from '@screens/DtmScreen';
import DtmMatchScreen from '@screens/DtmMatchScreen';
import DtmChatScreen from '@screens/DtmChatScreen';
import KundliScreen from '@screens/KundliScreen';
import NumerologyScreen from '@screens/NumerologyScreen';
import CreativityScreen from '@screens/CreativityScreen';
import SettingsScreen from '@screens/SettingsScreen';
import ProfileScreen from '@screens/ProfileScreen';
import ProfileEditScreen from '@screens/ProfileEditScreen';
import AiMatchScreen from '@screens/AiMatchScreen';
import BeatsScreen from '@screens/BeatsScreen';
import CompatibilityScreen from '@screens/CompatibilityScreen';
import DateIdeasScreen from '@screens/DateIdeasScreen';
import DatePlannerScreen from '@screens/DatePlannerScreen';
import FeedScreen from '@screens/FeedScreen';
import LoveLanguageScreen from '@screens/LoveLanguageScreen';
import NotificationsScreen from '@screens/NotificationsScreen';
import PremiumScreen from '@screens/PremiumScreen';
import SafetyScreen from '@screens/SafetyScreen';
import SearchScreen from '@screens/SearchScreen';
import SeriousModeScreen from '@screens/SeriousModeScreen';
import ShowcaseScreen from '@screens/ShowcaseScreen';
import StoriesScreen from '@screens/StoriesScreen';
import VerifyScreen from '@screens/VerifyScreen';
import VibeCheckScreen from '@screens/VibeCheckScreen';
import VideosScreen from '@screens/VideosScreen';
import AccessScreen from '@screens/AccessScreen';

// Admin (v3.6 expansion)
import AdminFairnessScreen from '@screens/admin/FairnessScreen';

// Settings sub-screens (v3.6 expansion)
import PrivacyScreen from '@screens/settings/PrivacyScreen';
import BlockedUsersScreen from '@screens/settings/BlockedUsersScreen';
import TrustedDevicesScreen from '@screens/settings/TrustedDevicesScreen';
import DeactivateScreen from '@screens/settings/DeactivateScreen';
import DeleteAccountScreen from '@screens/settings/DeleteAccountScreen';
import DataExportScreen from '@screens/settings/DataExportScreen';
import IntentOverrideScreen from '@screens/settings/IntentOverrideScreen';
import TrustScoreScreen from '@screens/settings/TrustScoreScreen';

import { useAuth } from '@hooks/useAuth';

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Tabs: undefined;
  Chat: { chatId: string; otherUser?: unknown };
  Dtm: undefined;
  DtmMatch: undefined;
  DtmChat: undefined;
  Kundli: { targetUserId?: string } | undefined;
  Numerology: { targetUserId?: string } | undefined;
  ProfileEdit: undefined;
  AiMatch: undefined;
  Beats: undefined;
  Compatibility: { targetUserId?: string };
  DateIdeas: undefined;
  DatePlanner: undefined;
  Feed: undefined;
  LoveLanguage: undefined;
  Notifications: undefined;
  Premium: undefined;
  Safety: undefined;
  Search: undefined;
  SeriousMode: undefined;
  Showcase: undefined;
  Stories: undefined;
  Verify: undefined;
  VibeCheck: undefined;
  Videos: undefined;
  Access: undefined;
  Settings: undefined;
  SettingsPrivacy: undefined;
  SettingsBlocked: undefined;
  SettingsDevices: undefined;
  SettingsDeactivate: undefined;
  SettingsDelete: undefined;
  SettingsExport: undefined;
  SettingsIntent: undefined;
  SettingsTrust: undefined;
  AdminFairness: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Creativity" component={CreativityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = !!(user as any)?.isAdmin;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Dtm" component={DtmScreen} />
            <Stack.Screen name="DtmMatch" component={DtmMatchScreen} />
            <Stack.Screen name="DtmChat" component={DtmChatScreen} />
            <Stack.Screen name="Kundli" component={KundliScreen} />
            <Stack.Screen name="Numerology" component={NumerologyScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="AiMatch" component={AiMatchScreen} />
            <Stack.Screen name="Beats" component={BeatsScreen} />
            <Stack.Screen name="Compatibility" component={CompatibilityScreen} />
            <Stack.Screen name="DateIdeas" component={DateIdeasScreen} />
            <Stack.Screen name="DatePlanner" component={DatePlannerScreen} />
            <Stack.Screen name="Feed" component={FeedScreen} />
            <Stack.Screen name="LoveLanguage" component={LoveLanguageScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Premium" component={PremiumScreen} />
            <Stack.Screen name="Safety" component={SafetyScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="SeriousMode" component={SeriousModeScreen} />
            <Stack.Screen name="Showcase" component={ShowcaseScreen} />
            <Stack.Screen name="Stories" component={StoriesScreen} />
            <Stack.Screen name="Verify" component={VerifyScreen} />
            <Stack.Screen name="VibeCheck" component={VibeCheckScreen} />
            <Stack.Screen name="Videos" component={VideosScreen} />
            <Stack.Screen name="Access" component={AccessScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="SettingsPrivacy" component={PrivacyScreen} />
            <Stack.Screen name="SettingsBlocked" component={BlockedUsersScreen} />
            <Stack.Screen name="SettingsDevices" component={TrustedDevicesScreen} />
            <Stack.Screen name="SettingsDeactivate" component={DeactivateScreen} />
            <Stack.Screen name="SettingsDelete" component={DeleteAccountScreen} />
            <Stack.Screen name="SettingsExport" component={DataExportScreen} />
            <Stack.Screen name="SettingsIntent" component={IntentOverrideScreen} />
            <Stack.Screen name="SettingsTrust" component={TrustScoreScreen} />
            {isAdmin ? (
              <Stack.Screen
                name="AdminFairness"
                component={AdminFairnessScreen}
              />
            ) : null}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
