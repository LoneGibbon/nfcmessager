import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import { Linking } from 'react-native';

// Pre-start NFC on app boot
NfcManager.start().catch(() => {});

const SCHEME = 'https';
const HOST = 'nfcmsg.test';

function buildDeepLink(message: string) {
  const encoded = encodeURIComponent(message);
  return `${SCHEME}://${HOST}/read?m=${encoded}`;
}

function parseMessageFromUrl(url?: string | null) {
  try {
    if (!url) return null;
    const u = new URL(url);

    // Check scheme and host
    if (u.protocol !== `${SCHEME}:` || u.hostname !== HOST) return null;

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
  const [isWriting, setIsWriting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const deepLink = useMemo(() => buildDeepLink(input), [input]);

  // Handle deep links (cold start + when already running)
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      console.log('Initial URL:', url);
      const msg = parseMessageFromUrl(url);
      if (msg) setLastRead(msg);
    });

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

  // -------- Write Mode --------
  const writeToTag = useCallback(async () => {
    try {
      setIsWriting(true);
      const uri = deepLink;
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(uri)]);

      await NfcManager.requestTechnology(NfcTech.Ndef);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);

      Alert.alert('Success', `Wrote tag:\n${uri}`);
    } catch (err: any) {
      console.log('Write error', err);
      Alert.alert('NFC error', err?.message ?? String(err));
    } finally {
      setIsWriting(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }, [deepLink]);

  // -------- Manual Read Mode --------
  const readTag = useCallback(async () => {
    try {
      setIsReading(true);
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      console.log('Tag object:', tag);

      const ndef = await NfcManager.ndefHandler.getNdefMessage();
      if (ndef?.ndefMessage?.length) {
        const record = ndef.ndefMessage[0];
        if (record?.payload) {
          // Decode text payload (skip the status byte at payload[0])
          const text = Ndef.text.decodePayload(record.payload);
          setLastRead(text || 'No message found');
        }
      }
    } catch (err: any) {
      console.log('Read error', err);
      Alert.alert('NFC error', err?.message ?? String(err));
    } finally {
      setIsReading(false);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>NFC Msg Demo</Text>

      {/* Write Section */}
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
        {isWriting && (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color="blue" />
            <Text style={{ marginLeft: 8 }}>Waiting for NFC tag…</Text>
          </View>
        )}
      </View>

      {/* Read Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Read mode</Text>
        <Text style={styles.hint}>
          1. Tap a tag on the home screen → app opens automatically.{'\n'}
          2. Or press the button below to scan manually.
        </Text>
        <Button title="Read NFC Tag" onPress={readTag} />
        {isReading && (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color="green" />
            <Text style={{ marginLeft: 8 }}>Hold tag near phone…</Text>
          </View>
        )}
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
  centerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
});
