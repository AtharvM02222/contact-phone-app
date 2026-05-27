import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  photoUri: string | null;
}

const KEY = "contacts_v1";

export async function loadContacts(): Promise<Contact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(contacts));
}

export async function addContact(contact: Contact): Promise<void> {
  const list = await loadContacts();
  await saveContacts([...list, contact]);
}

export async function deleteContact(id: string): Promise<void> {
  const list = await loadContacts();
  await saveContacts(list.filter((c) => c.id !== id));
}
