// app/_layout.tsx
// (This is the file you sent me, but with the proper splash screen logic)

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, SplashScreen } from 'expo-router'; // <-- Import SplashScreen
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react'; // <-- Import useEffect
import { useFonts } from 'expo-font'; // <-- Import useFonts

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// This prevents the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // --- ADD THIS FONT LOADING LOGIC ---
  const [loaded, error] = useFonts({
    // Add any custom fonts you have here, e.g.:
    // 'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Hide the splash screen once fonts are loaded
  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // If fonts are not loaded, don't render anything
  if (!loaded && !error) {
    return null;
  }
  // --- END OF NEW LOGIC ---

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      
      {/* This is now fixed! The splash screen will hide, 
        and the status bar will appear as normal.
      */}
      <StatusBar style="auto" hidden={false} /> 
    </ThemeProvider>
  );
}