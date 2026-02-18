import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { DataProvider } from "@/lib/DataContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <DataProvider>
              <Stack
                screenOptions={{
                  headerBackTitle: "Back",
                  headerStyle: { backgroundColor: Colors.bg },
                  headerTintColor: Colors.textPrimary,
                  contentStyle: { backgroundColor: Colors.bg },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="product/[barcode]"
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="compare" options={{ headerShown: false }} />
                <Stack.Screen
                  name="list/[id]"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="login-new"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="health-info"
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="chat" options={{ headerShown: false }} />
              </Stack>
            </DataProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
