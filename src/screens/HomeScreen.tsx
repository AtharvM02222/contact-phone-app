import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Contact, loadContacts, deleteContact } from "../utils/storage";

const { width } = Dimensions.get("window");
const COLS = 2;
const TILE = (width - 48) / COLS;

const INITIALS_COLORS = [
  "#1A1A1A",
  "#2D4A6B",
  "#3D2B1F",
  "#1F3D2B",
  "#3D1F2B",
  "#2B1F3D",
];

function getColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return INITIALS_COLORS[Math.abs(h) % INITIALS_COLORS.length];
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editMode, setEditMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadContacts().then(setContacts);
    }, [])
  );

  async function handleCall(contact: Contact) {
    const url = `tel:${contact.phone.replace(/\s|-/g, "")}`;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Cannot make calls on this device.");
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Remove contact?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteContact(id);
          setContacts((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  }

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => !editMode && handleCall(item)}
      style={styles.tile}
    >
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, { backgroundColor: getColor(item.name) }]}>
          <Text style={styles.initialsText}>{initials(item.name)}</Text>
        </View>
      )}

      <View style={styles.nameBar}>
        <Text style={styles.nameText} numberOfLines={1}>
          {item.name}
        </Text>
      </View>

      {editMode && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteBtnText}>—</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        {contacts.length > 0 && (
          <TouchableOpacity onPress={() => setEditMode((e) => !e)}>
            <Text style={[styles.headerBtn, editMode && styles.headerBtnActive]}>
              {editMode ? "Done" : "Edit"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {contacts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No contacts</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button below to add someone
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          renderItem={renderItem}
        />
      )}

      {/* Add button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("Add")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  headerBtn: {
    fontSize: 17,
    color: "#555",
    fontWeight: "500",
  },
  headerBtnActive: {
    color: "#111",
    fontWeight: "700",
  },
  grid: {
    padding: 16,
    paddingBottom: 100,
  },
  tile: {
    width: TILE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  photo: {
    width: TILE,
    height: TILE,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: TILE * 0.28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -1,
  },
  nameBar: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8E8E8",
  },
  nameText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
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
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "300",
    lineHeight: 36,
  },
});
