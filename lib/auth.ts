import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './storage';

const AUTH_KEYS = {
  IS_FIRST_TIME: '@foodscan_first_time',
  USER_TOKEN: '@foodscan_user_token',
  USER_EMAIL: '@foodscan_user_email',
  IS_LOGGED_IN: '@foodscan_logged_in',
};

export interface AuthUser {
  email: string;
  name: string;
  token: string;
  createdAt: string;
}

export async function isFirstTimeUser(): Promise<boolean> {
  try {
    const isFirstTime = await AsyncStorage.getItem(AUTH_KEYS.IS_FIRST_TIME);
    return isFirstTime === null;
  } catch {
    return true;
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEYS.IS_FIRST_TIME, 'false');
}

export async function loginUser(email: string, name: string): Promise<AuthUser> {
  const user: AuthUser = {
    email,
    name,
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(AUTH_KEYS.USER_EMAIL, email);
  await AsyncStorage.setItem(AUTH_KEYS.USER_TOKEN, user.token);
  await AsyncStorage.setItem(AUTH_KEYS.IS_LOGGED_IN, 'true');
  await AsyncStorage.setItem(AUTH_KEYS.IS_FIRST_TIME, 'false');

  return user;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.multiRemove([
    AUTH_KEYS.USER_TOKEN,
    AUTH_KEYS.USER_EMAIL,
    AUTH_KEYS.IS_LOGGED_IN,
  ]);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_KEYS.USER_TOKEN);
    const email = await AsyncStorage.getItem(AUTH_KEYS.USER_EMAIL);
    const isLoggedIn = await AsyncStorage.getItem(AUTH_KEYS.IS_LOGGED_IN);

    if (token && email && isLoggedIn === 'true') {
      return {
        email,
        name: email.split('@')[0], // Extract name from email
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
    return isLoggedIn === 'true';
  } catch {
    return false;
  }
}

function generateToken(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export async function updateUserProfile(profile: UserProfile): Promise<void> {
  // This will be used to update profile during login/registration
  const { saveProfile } = require('./storage');
  await saveProfile(profile);
}
