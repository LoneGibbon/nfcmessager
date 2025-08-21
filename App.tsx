import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import { Linking } from 'react-native'; // ✅ correct form for RN 0.81

// Pre-start NFC on app boot
NfcManager.start().catch(() => {});

const SCHEME = 'nfcmsg'; // custom scheme from AndroidManifest
const HOST = 'read'; // host from AndroidManifest

function buildDeepLink(message: string) {
  const encoded = encodeURIComponent(message);
  return `${SCHEME}://${HOST}?m=${encoded}`;
}

function parseMessageFromUrl(url?: string | null) {
  try {
    if (!url) return null;
    const u = new URL(url);

    // only check protocol, ignore host (since Android sometimes strips it)
    if (u.protocol !== `${SCHEME}:`) return null;

    const raw = u.searchParams.get('m');
    return raw ? decodeURIComponent(raw) : null;
  } catch (err) {
    console.log('Failed to parse URL', url, err);
    return null;
  }
}

export default function App() {
  const [input, setInput] = useState('Hello from NFC');
  const [lastRead, setLastRead] = useState<string | null>(null);
  const deepLink = useMemo(() => buildDeepLink(input), [input]);

  // Handle deep links (cold start + when already running)
  useEffect(() => {
    // Always check cold start
    Linking.getInitialURL().then(url => {
      console.log('Initial URL:', url);
      const msg = parseMessageFromUrl(url);
      if (msg) setLastRead(msg);
    });

    // Listen for new links while running
    const subscription = Linking.addEventListener('url', e => {
      console.log('URL event received:', e.url);
      const msg = parseMessageFromUrl(e.url);
      if (msg) setLastRead(msg);
      else setLastRead('No message found');
    });

    return () => {
      (subscription as any).remove?.();
    };
  }, []);

  const writeToTag = useCallback(async () => {
    try {
      const uri = deepLink;
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(uri)]);

      await NfcManager.requestTechnology(NfcTech.Ndef);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      Alert.alert('Success', `Wrote tag:\n${uri}`);
    } catch (err: any) {
      Alert.alert('NFC error', err?.message ?? String(err));
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }, [deepLink]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>NFC Msg Demo</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Write mode</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a short message"
        />
        <Text style={styles.mono}>Deep link preview: {deepLink}</Text>
        <Button title="Write to NFC tag" onPress={writeToTag} />
        <Text style={styles.hint}>
          When prompted, hold a blank NDEF-compatible tag near the phone.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Read mode</Text>
        <Text style={styles.hint}>
          Scan the tag (screen on). Android will open this app via the deep
          link. The message appears below:
        </Text>
        <Text style={styles.readout}>
          {lastRead ?? '— nothing received yet —'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 10 },
  mono: { fontFamily: 'monospace' },
  hint: { color: '#666' },
  readout: { marginTop: 8, fontSize: 16, fontWeight: '600' },
});
