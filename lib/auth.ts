import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile } from "./storage";

const AUTH_KEYS = {
  IS_FIRST_TIME: "@foodscan_first_time",
  USER_TOKEN: "@foodscan_user_token",
  USER_EMAIL: "@foodscan_user_email",
  USER_NAME: "@foodscan_user_name",
  IS_LOGGED_IN: "@foodscan_logged_in",
  ONBOARDING_COMPLETE: "@foodscan_onboarding_complete",
};

export interface AuthUser {
  email: string;
  name: string;
  token: string;
  createdAt: string;
}

export async function isFirstTimeUser(): Promise<boolean> {
  try {
    const onboardingComplete = await AsyncStorage.getItem(
      AUTH_KEYS.ONBOARDING_COMPLETE,
    );
    // If onboarding is not complete, it's a first-time user
    return onboardingComplete !== "true";
  } catch {
    return true;
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEYS.ONBOARDING_COMPLETE, "true");
  console.log("Onboarding marked as complete");
}

export async function loginUser(
  email: string,
  name: string,
): Promise<AuthUser> {
  const user: AuthUser = {
    email,
    name,
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(AUTH_KEYS.USER_EMAIL, email);
  await AsyncStorage.setItem(AUTH_KEYS.USER_NAME, name);
  await AsyncStorage.setItem(AUTH_KEYS.USER_TOKEN, user.token);
  await AsyncStorage.setItem(AUTH_KEYS.IS_LOGGED_IN, "true");

  // Initialize profile with user's name for first-time users
  const { saveProfile, getProfile } = require("./storage");
  const existingProfile = await getProfile();

  // Only update profile if it's empty or doesn't have a name
  if (!existingProfile.name || existingProfile.name === "") {
    const updatedProfile = {
      ...existingProfile,
      name: name,
    };
    await saveProfile(updatedProfile);
  }

  console.log("User logged in:", email);
  return user;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.multiRemove([
    AUTH_KEYS.USER_TOKEN,
    AUTH_KEYS.USER_EMAIL,
    AUTH_KEYS.USER_NAME,
    AUTH_KEYS.IS_LOGGED_IN,
    AUTH_KEYS.ONBOARDING_COMPLETE,
  ]);
  console.log("User logged out");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_KEYS.USER_TOKEN);
    const email = await AsyncStorage.getItem(AUTH_KEYS.USER_EMAIL);
    const name = await AsyncStorage.getItem(AUTH_KEYS.USER_NAME);
    const isLoggedIn = await AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN);

    if (token && email && isLoggedIn === "true") {
      return {
        email,
        name: name || email.split("@")[0], // Use stored name or extract from email
        token,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  try {
    const isLoggedIn = await AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN);
    return isLoggedIn === "true";
  } catch {
    return false;
  }
}

function generateToken(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  // This will be used to update profile during login/registration
  const { saveProfile } = require("./storage");
  await saveProfile(profile);
  console.log("Profile updated:", profile.name);
}
