import React, { useCallback, useEffect, useRef, useState } from "react";
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
import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import { Contact, loadContacts, deleteContact, cleanPhone, loadUIPreferences, saveUIPreferences } from "../utils/storage";

const { width } = Dimensions.get("window");

// ─── Master size constants ────────────────────────────────────────────────────
const PADDING = 16;        // outer horizontal padding (each side)
const GAP     = 12;        // gap between cards
const COLS    = 2;

/** Compute tile size given a scale multiplier (0.0 → min, 1.0 → max). */
function computeTileSize(scale: number): number {
  const baseSize  = (width - PADDING * 2 - GAP) / COLS; // two columns, one gap
  const minFactor = 0.55;  // smallest cards (~55 % of base)
  const maxFactor = 1.20;  // largest cards (~120 % of base, 1-col feel)
  return baseSize * (minFactor + (maxFactor - minFactor) * scale);
}

/** Compute how many columns fit at a given tile size. */
function computeCols(tileSize: number): number {
  const available = width - PADDING * 2;
  return Math.max(1, Math.floor((available + GAP) / (tileSize + GAP)));
}

// ─── Initials helpers ─────────────────────────────────────────────────────────
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
  if (!name) return "?";
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => w.replace(/[^a-zA-Z]/g, ""))
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return letters || "?";
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PlaceholderTile({ name, size }: { name: string | null; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: getColor(name ?? ""),
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.28, fontWeight: "700", color: "#fff", letterSpacing: -1 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

function CallIcon({ size, color }: { size: number; color: string }) {
  return <Text style={{ fontSize: size * 0.65, color, lineHeight: size }}>📞</Text>;
}

/**
 * Pure function: toggles selectedId.
 * Exported so unit/property tests can call it directly.
 */
export function handleTilePress_pure(selectedId: string | null, contactId: string): string | null {
  return selectedId === contactId ? null : contactId;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  // cardScale: 0 = smallest, 1 = largest
  const [cardScale, setCardScale]     = useState<number>(0.5);
  const [showSizer, setShowSizer]     = useState<boolean>(false);
  const userTouchedSizerRef = useRef(false);

  const tileSize = computeTileSize(cardScale);
  const numCols  = computeCols(tileSize);
  // actual tile fills the available space perfectly for the current column count
  const actualTile = (width - PADDING * 2 - GAP * (numCols - 1)) / numCols;

  // Contacts still refresh on every focus (needed after Add/Delete).
  useFocusEffect(
    useCallback(() => {
      loadContacts()
        .then(setContacts)
        .catch(() => {
          Alert.alert("Error", "Could not load contacts. Please restart the app.");
          setContacts([]);
        });
    }, [])
  );

  // UI prefs load ONCE on mount, not on every focus.
  useEffect(() => {
    loadUIPreferences()
      .then(prefs => {
        if (userTouchedSizerRef.current) return;
        setCardScale(prefs.cardScale);
        setShowSizer(prefs.showSizer);
      })
      .catch(() => {
        if (userTouchedSizerRef.current) return;
        setCardScale(0.5);
        setShowSizer(false);
      });
  }, []);

  function handleTilePress(item: Contact) {
    setSelectedId(prev => (prev === item.id ? null : item.id));
  }

  // Fires continuously while dragging — cheap, no I/O.
  function handleCardScaleChange(newScale: number) {
    userTouchedSizerRef.current = true;
    setCardScale(newScale);
  }

  // Fires once on release — persist here instead.
  function handleCardScaleComplete(newScale: number) {
    setShowSizer(currentShowSizer => {
      saveUIPreferences({ cardScale: newScale, showSizer: currentShowSizer });
      return currentShowSizer;
    });
  }

  function handleShowSizerToggle() {
    userTouchedSizerRef.current = true;
    setShowSizer(prev => {
      const newValue = !prev;
      saveUIPreferences({ cardScale, showSizer: newValue });
      return newValue;
    });
  }

  async function handleCallPress(contact: Contact) {
    if (!contact.phone) {
      Alert.alert("No Number", "This contact has no phone number.");
      return;
    }
    const cleaned = cleanPhone(contact.phone);
    const url = `tel:${cleaned}`;
    
    try {
      setSelectedId(null);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Error", "Unable to make a call. Please check your device settings.");
    }
  }

  function handleLongPress(contact: Contact) {
    setSelectedId(null);
    Alert.alert("Remove Contact?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => handleDelete(contact),
      },
    ]);
  }

  async function handleDelete(contact: Contact) {
    try {
      await deleteContact(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
    } catch {
      Alert.alert("Error", "Could not delete contact. Please try again.");
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
        style={[
          styles.tile,
          {
            width: actualTile,
            height: actualTile,
            borderRadius: 12 + actualTile * 0.02,
          },
        ]}
      >
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={{ width: actualTile, height: actualTile }} />
        ) : (
          <PlaceholderTile name={item.name} size={actualTile} />
        )}

        {isSelected && (
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={0.9}
            onPress={() => handleCallPress(item)}
            accessibilityLabel="Call"
          >
            <CallIcon size={actualTile * 0.4} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>

        <View style={styles.headerActions}>
          {/* Size toggle button */}
          <TouchableOpacity
            onPress={handleShowSizerToggle}
            accessibilityLabel="Resize cards"
            style={[styles.iconBtn, showSizer && styles.iconBtnActive]}
          >
            <Text style={[styles.iconBtnText, showSizer && styles.iconBtnTextActive]}>⊞</Text>
          </TouchableOpacity>

          {/* Add contact button */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Add")}
            accessibilityLabel="Add Contact"
            style={styles.iconBtn}
          >
            <Text style={styles.addBtn}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Card size slider panel ── */}
      {showSizer && (
        <View style={styles.sizerPanel}>
          <Text style={styles.sizerLabel}>Card Size</Text>
          <View style={styles.sizerRow}>
            <Text style={styles.sizerHint}>S</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={cardScale}
              onValueChange={handleCardScaleChange}
              onSlidingComplete={handleCardScaleComplete}
              minimumTrackTintColor="#111"
              maximumTrackTintColor="#D0D0D0"
              thumbTintColor="#111"
            />
            <Text style={styles.sizerHint}>L</Text>
          </View>
        </View>
      )}

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
              keyExtractor={item => item.id}
              // key forces FlatList to remount when column count changes
              key={numCols}
              numColumns={numCols}
              contentContainerStyle={[styles.grid, { padding: PADDING }]}
              columnWrapperStyle={numCols > 1 ? { gap: GAP } : undefined}
              ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
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

  // ── Header ──
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActive: {
    backgroundColor: "#111",
  },
  iconBtnText: {
    fontSize: 22,
    color: "#111",
  },
  iconBtnTextActive: {
    color: "#fff",
  },
  addBtn: {
    fontSize: 32,
    color: "#111",
    fontWeight: "300",
    lineHeight: 36,
  },

  // ── Sizer panel ──
  sizerPanel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  sizerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sizerHint: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    width: 14,
    textAlign: "center",
  },

  // ── Grid ──
  grid: {
    // padding applied dynamically via contentContainerStyle
  },
  tile: {
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Empty state ──
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
