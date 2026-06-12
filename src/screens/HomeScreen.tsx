import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Contact, loadContacts, deleteContact, cleanPhone } from "../utils/storage";

const { width } = Dimensions.get("window");
const COLS = 2;
export const TILE = (width - 48) / COLS;

const INITIALS_COLORS = [
  "#1A1A1A",
  "#2D4A6B",
  "#3D2B1F",
  "#1F3D2B",
  "#3D1F2B",
  "#2B1F3D",
];

export function getColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return INITIALS_COLORS[Math.abs(h) % INITIALS_COLORS.length];
}

export function initials(name: string | null): string {
  if (!name) return '?';
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

function PlaceholderTile({ name, size }: { name: string | null; size: number }) {
  const label = initials(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: getColor(name ?? ''),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.28, fontWeight: '700', color: '#fff', letterSpacing: -1 }}>
        {label}
      </Text>
    </View>
  );
}

function CallIcon({ size, color }: { size: number; color: string }) {
  return (
    <Text style={{ fontSize: size * 0.65, color, lineHeight: size }}>📞</Text>
  );
}

/**
 * Pure function: toggles selectedId.
 * Same id → null (dismiss); different id → new id (show overlay).
 * Exported so unit/property tests can call it directly.
 * Validates: Requirements 4.1, 4.3, 4.4, 4.5
 */
export function handleTilePress_pure(selectedId: string | null, contactId: string): string | null {
  return selectedId === contactId ? null : contactId;
}

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadContacts()
        .then(setContacts)
        .catch(() => {
          Alert.alert('Error', 'Could not load contacts. Please restart the app.');
          setContacts([]);
        });
    }, [])
  );

  function handleTilePress(item: Contact) {
    setSelectedId(prev => prev === item.id ? null : item.id);
  }

  async function handleCallPress(contact: Contact) {
    if (!contact.phone) {
      Alert.alert('No Number', 'This contact has no phone number.');
      return;
    }
    const cleaned = cleanPhone(contact.phone);
    const url = `tel:${cleaned}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Not Supported', 'Calls are not supported on this device.');
      return; // overlay stays visible
    }
    setSelectedId(null);
    await Linking.openURL(url);
  }

  function handleLongPress(contact: Contact) {
    setSelectedId(null);
    Alert.alert(
      'Remove Contact?',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => handleDelete(contact),
        },
      ]
    );
  }

  async function handleDelete(contact: Contact) {
    try {
      await deleteContact(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
    } catch {
      Alert.alert('Error', 'Could not delete contact. Please try again.');
    }
  }

  const renderItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedId === item.id;
    return (
      <TouchableOpacity
        activeOpacity={1}
        delayLongPress={500}
        onPress={() => handleTilePress(item)}
        onLongPress={() => handleLongPress(item)}
        style={styles.tile}
      >
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
        ) : (
          <PlaceholderTile name={item.name} size={TILE} />
        )}

        {isSelected && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={0.9}
            onPress={() => handleCallPress(item)}
            accessibilityLabel="Call"
          >
            <CallIcon size={56} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Add')}
          accessibilityLabel="Add Contact"
          style={styles.addContactBtn}
        >
          <Text style={styles.addBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Contacts Yet</Text>
          <Text style={styles.emptySubtitle}>Tap + to add your first contact</Text>
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={() => setSelectedId(null)}>
          <View style={{ flex: 1 }}>
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              numColumns={COLS}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={{ gap: 16 }}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              renderItem={renderItem}
            />
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.5,
  },
  addContactBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    fontSize: 32,
    color: "#111",
    fontWeight: "300",
    lineHeight: 36,
  },
  grid: {
    padding: 16,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  photo: {
    width: TILE,
    height: TILE,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
});
