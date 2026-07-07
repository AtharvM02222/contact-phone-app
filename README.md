# Nani Contacts

# Fix: Card-size slider (contact-phone-app)

## Repo / file
`AtharvM02222/contact-phone-app` → `src/screens/HomeScreen.tsx`

## Symptoms
1. Tapping the ⊞ (resize) button in the header does nothing the first time. Backgrounding the app (recents) and reopening it makes the slider panel appear correctly.
2. Once the panel is visible, dragging the `Slider` thumb doesn't move — it feels stuck in place.

## Root causes

**Bug 1 — stale async load clobbers the toggle**
`useFocusEffect` calls `loadUIPreferences()` (an async `AsyncStorage.getItem`) on every screen focus, including the very first mount. If the user taps ⊞ before that read resolves, the tap sets `showSizer` to `true`, but the in-flight `loadUIPreferences()` promise — which started reading storage *before* the tap's write landed — resolves afterward with the old `false` value and overwrites it. Going to recents and back re-triggers the effect; by then the earlier write has landed, so the read is correct and the panel shows.

**Bug 2 — storage write on every drag frame**
`onValueChange` (which fires on ~every pixel of the drag, since `step={0.01}`) calls `saveUIPreferences()` — an `AsyncStorage.setItem` — on every single tick. That floods the bridge with I/O during the gesture and stalls incoming touch-move events, so the thumb appears frozen.

## Required changes (in `HomeScreen.tsx` only)

1. Split the single `useFocusEffect` into:
   - `useFocusEffect` — keeps only `loadContacts()` (this legitimately needs to re-run every focus, e.g. after Add/Delete).
   - A plain `useEffect(() => {...}, [])` — loads UI prefs **once**, on mount only, not on every focus.
2. Add a `useRef` flag (`userTouchedSizerRef`) set to `true` inside `handleShowSizerToggle` and `handleCardScaleChange`. The mount-time prefs load must check this flag and skip applying `setCardScale`/`setShowSizer` if the user has already interacted, so a slow initial read can never stomp a manual toggle.
3. Split slider callbacks:
   - `onValueChange` → only `setCardScale(newScale)` (plus setting the touched ref). No `AsyncStorage` calls here.
   - Add `onSlidingComplete` → persists via `saveUIPreferences({ cardScale, showSizer })`, fired once on release.
4. Import `useEffect` and `useRef` from `react` (already imports `useCallback`, `useState`).
5. Don't change anything else — styles, `renderItem`, `computeTileSize`, `computeCols`, etc. stay as-is.

## Reference implementation

```tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
// ...unchanged imports below this line

export default function HomeScreen({ navigation }: Props) {
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [cardScale, setCardScale]     = useState<number>(0.5);
  const [showSizer, setShowSizer]     = useState<boolean>(false);
  const userTouchedSizerRef = useRef(false);

  const tileSize = computeTileSize(cardScale);
  const numCols  = computeCols(tileSize);
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

  // ...rest of file (handleCallPress, handleLongPress, handleDelete, renderItem,
  // and the JSX return block) stays exactly as it currently is, EXCEPT the
  // Slider element, which gets one new prop:

  // <Slider
  //   style={styles.slider}
  //   minimumValue={0}
  //   maximumValue={1}
  //   step={0.01}
  //   value={cardScale}
  //   onValueChange={handleCardScaleChange}
  //   onSlidingComplete={handleCardScaleComplete}
  //   minimumTrackTintColor="#111"
  //   maximumTrackTintColor="#D0D0D0"
  //   thumbTintColor="#111"
  // />
}
```

## Acceptance criteria
- [ ] Cold-launch app → first tap on ⊞ shows the size panel immediately, every time.
- [ ] Dragging the slider tracks the finger smoothly with no lag or freeze.
- [ ] Card size still persists correctly across app restarts (`cardScale`/`showSizer` saved on release and on toggle).
- [ ] Contacts list still refreshes correctly after returning from the Add screen.
- [ ] No new TypeScript errors (`tsc --noEmit`).

## If the slider is still stuck after this fix
Check for a gesture conflict with `@react-navigation/stack`'s screen-swipe gesture (it uses `react-native-gesture-handler` and can intercept horizontal pans). Since `Home` is the root screen anyway, it's safe to add `gestureEnabled: false` to its `Stack.Screen` options in `App.tsx` as a defensive measure — it can't go back further, so disabling the gesture there costs nothing.