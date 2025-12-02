import { Stack } from 'expo-router';

// Ensure the mobile app has a sensible default API base for development.
// The Android emulator (AVD) reaches the host machine's localhost at 10.0.2.2.
if (typeof global !== 'undefined' && !(global as any).NUTRITION_API_BASE) {
  (global as any).NUTRITION_API_BASE = 'http://10.0.2.2:3000';
}

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="meal" />
      <Stack.Screen name="NutritionDetails"/>
      <Stack.Screen name="manual_logging"/>
      <Stack.Screen name="login"/>
      <Stack.Screen name="signup"/>
    </Stack>
  );
}