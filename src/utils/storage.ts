import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Contact {
  id: string;
  name: string | null;
  phone: string;
  photoUri: string | null;
}

const KEY = "contacts_v1";
const UI_PREFS_KEY = "ui_preferences_v1";

export interface UIPreferences {
  cardScale: number;
  showSizer: boolean;
}

/**
 * Strips whitespace, hyphens, parentheses, and dots from a phone string.
 * Used at dial-time to build a clean `tel:` URL.
 * Requirements: 5.4
 */
export function cleanPhone(s: string): string {
  return s.replace(/[\s\-().]+/g, "");
}

/**
 * Returns true iff the input is a plausible phone number:
 * 1–20 characters long, containing only digits, spaces, +, -, (, ), or dots.
 * Requirements: 2.5
 */
export function isValidPhone(value: string): boolean {
  return /^[\d\s+\-()\\.]{1,20}$/.test(value.trim());
}

export async function loadContacts(): Promise<Contact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // Returns [] on any storage or parse error so the app always has a safe fallback.
    return [];
  }
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(contacts));
  } catch (err) {
    // Re-throw so callers (addContact, deleteContact) can catch storage failures
    // and inform the user without silently losing data. Requirements: 7.5, 7.6
    throw err;
  }
}

export async function addContact(contact: Contact): Promise<void> {
  const list = await loadContacts();
  await saveContacts([...list, contact]);
}

export async function deleteContact(id: string): Promise<void> {
  const list = await loadContacts();
  await saveContacts(list.filter((c) => c.id !== id));
}

export async function loadUIPreferences(): Promise<UIPreferences> {
  try {
    const raw = await AsyncStorage.getItem(UI_PREFS_KEY);
    return raw ? JSON.parse(raw) : { cardScale: 0.5, showSizer: false };
  } catch {
    return { cardScale: 0.5, showSizer: false };
  }
}

export async function saveUIPreferences(prefs: UIPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Silently fail for UI preferences as they're non-critical
  }
}
