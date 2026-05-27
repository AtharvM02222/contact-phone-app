# Nani Contacts

Clean contact app for grandma. Large photos, tap to call.

## Setup

```bash
npm install
```

## Run on phone (Expo Go)

```bash
npx expo start
```
Scan the QR code with Expo Go app (Android).

## Build APK (no Android Studio needed)

```bash
# One-time: install EAS CLI + login
npm install -g eas-cli
eas login

# Build APK via cloud (free tier: 30 builds/month)
eas build -p android --profile preview
```

EAS will give you a download link for the .apk — install it on grandma's phone.

## Features

- Large 2-column photo grid
- Tap photo → calls the number directly
- Add contact: name + phone + photo (gallery or camera)
- Edit mode to delete contacts
- Contacts stored locally on device (AsyncStorage)
- No internet required after install

## Permissions used

- `CALL_PHONE` — to dial directly
- `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` — to pick photos
- `CAMERA` — to take photos
