import { Stack } from 'expo-router';

// Prefer env-provided base (EXPO_PUBLIC_NUTRITION_API_BASE), fallback to Android emulator host alias 10.0.2.2.
const envBase = process.env.EXPO_PUBLIC_NUTRITION_API_BASE;
const defaultBase = 'http://10.0.2.2:3000';

if (typeof global !== 'undefined' && !(global as any).NUTRITION_API_BASE) {
  const base = (envBase || defaultBase).replace(/\/$/, '');
  (global as any).NUTRITION_API_BASE = base;
}

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="meal_information" />
      <Stack.Screen name="NutritionDetails"/>
      <Stack.Screen name="manual_logging"/>
      <Stack.Screen name="home"/>
      <Stack.Screen name="profile"/>
      <Stack.Screen name="signup"/>
    </Stack>
  );
}