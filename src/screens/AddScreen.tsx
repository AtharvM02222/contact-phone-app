import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { addContact, isValidPhone } from "../utils/storage";
import { Contact } from "../utils/storage";

interface Props {
  navigation: any;
}

export default function AddScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to add a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const src = result.assets[0].uri;
      const dest = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
      try {
        await FileSystem.copyAsync({ from: src, to: dest });
        setPhotoUri(dest);
      } catch {
        Alert.alert('Error', 'Could not save the photo. Please try again.');
        // photoUri remains unchanged
      }
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const src = result.assets[0].uri;
      const dest = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
      try {
        await FileSystem.copyAsync({ from: src, to: dest });
        setPhotoUri(dest);
      } catch {
        Alert.alert('Error', 'Could not save the photo. Please try again.');
        // photoUri remains unchanged
      }
    }
  }

  function showPhotoPicker() {
    Alert.alert("Add Photo", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSave() {
    setPhoneError(null);
    const trimPhone = phone.trim();
    if (!isValidPhone(trimPhone)) {
      setPhoneError('Enter a valid phone number (digits, +, -, spaces, up to 20 chars).');
      return;
    }
    const contact: Contact = {
      id: Date.now().toString(),
      name: name.trim() || null,   // name is optional
      phone: trimPhone,
      photoUri,
    };
    try {
      await addContact(contact);
    } catch {
      Alert.alert('Error', 'Could not save contact. Please try again.');
      return;   // Do NOT call goBack on failure
    }
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.root} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Contact</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtn}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Photo picker */}
        <TouchableOpacity style={styles.photoPicker} onPress={showPhotoPicker} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>+</Text>
              <Text style={styles.photoPlaceholderLabel}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="#C0C0C0"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={[styles.field, { marginTop: 16 }]}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor="#C0C0C0"
              keyboardType="phone-pad"
              returnKeyType="done"
            />
            {phoneError && (
              <Text style={styles.phoneErrorText}>{phoneError}</Text>
            )}
          </View>
        </View>

        {/* Save button (big, for grandma) */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save Contact</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  backBtn: { minWidth: 60 },
  backText: {
    fontSize: 17,
    color: "#555",
  },
  saveBtn: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    minWidth: 60,
    textAlign: "right",
  },
  photoPicker: {
    alignSelf: "center",
    marginTop: 36,
    marginBottom: 32,
  },
  photoPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D8D8D8",
    borderStyle: "dashed",
  },
  photoPlaceholderIcon: {
    fontSize: 44,
    color: "#999",
    fontWeight: "300",
    lineHeight: 48,
  },
  photoPlaceholderLabel: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    fontWeight: "500",
  },
  form: {
    paddingHorizontal: 20,
  },
  field: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D8D8D8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: "#FAFAFA",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    marginTop: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    fontSize: 20,
    color: "#111",
    paddingVertical: 10,
    fontWeight: "400",
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 36,
    marginBottom: 40,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  phoneErrorText: {
    fontSize: 13,
    color: '#E53935',
    marginTop: 4,
    marginBottom: 8,
    fontWeight: '500',
  },
});
