import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Role = 'participant' | 'guide';
type Step = 'phone' | 'code' | 'welcome';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fogopanel.vercel.app';

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('90')) return `+${digits}`;
  return `+${digits}`;
}

async function requestCode(phone: string, role: Role) {
  if (!API_URL) return { demo: true };
  const response = await fetch(`${API_URL}/api/mobile/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Kod gönderilemedi.');
  return result;
}

async function verifyCode(phone: string, role: Role, code: string) {
  if (!API_URL) {
    if (code !== '1234') throw new Error('Kod hatalı. Tekrar deneyin.');
    return { ok: true, phone, role, demo: true };
  }
  const response = await fetch(`${API_URL}/api/mobile/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role, code }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Kod doğrulanamadı.');
  return result;
}

export default function App() {
  const [role, setRole] = useState<Role>('participant');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const isGuide = role === 'guide';

  function toggleRole() {
    setRole((current) => current === 'participant' ? 'guide' : 'participant');
    setStep('phone');
    setCode('');
  }

  async function sendCode() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      Alert.alert('Telefon numarası', 'Geçerli bir telefon numarası girin.');
      return;
    }
    const normalizedPhone = normalizePhone(phone);
    setBusy(true);
    try {
      await requestCode(normalizedPhone, role);
      setStep('code');
    } catch (error) {
      Alert.alert('Kod gönderilemedi', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (code.length !== 4) {
      Alert.alert('Doğrulama kodu', '4 haneli kodu girin.');
      return;
    }
    setBusy(true);
    try {
      await verifyCode(normalizePhone(phone), role, code);
      setStep('welcome');
    } catch (error) {
      Alert.alert('Giriş yapılamadı', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Image source={require('./assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Fogo" />
            {step !== 'welcome' && (
              <Pressable accessibilityRole="button" accessibilityLabel={isGuide ? 'Katılımcı girişine geç' : 'Rehber girişine geç'} onPress={toggleRole} style={styles.roleSwitch}>
                <Text style={styles.roleSwitchIcon}>{isGuide ? '♙' : '♧'}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.hero}>
            {(step !== 'phone' || isGuide) && <Text style={styles.title}>{step === 'welcome' ? 'Harika,\nhazırsın.' : step === 'code' ? 'Telefonunu\ndoğrula.' : 'Rehber girişi'}</Text>}
            {step !== 'phone' && (
              <Text style={[styles.subtitle, step === 'phone' && styles.phoneSubtitle]}>
                {step === 'welcome'
                  ? `${isGuide ? 'Rehber' : 'Katılımcı'} olarak giriş yaptın.`
                  : step === 'code'
                    ? `${phone} numarasına gönderilen 4 haneli kodu gir.`
                  : ''}
              </Text>
            )}
          </View>

          {step === 'welcome' ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
              <Text style={styles.successTitle}>Giriş başarılı</Text>
              <Text style={styles.successBody}>{phone}</Text>
              <Pressable style={styles.secondaryButton} onPress={() => { setStep('phone'); setCode(''); }}>
                <Text style={styles.secondaryButtonText}>Giriş ekranına dön</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formCard}>
              {step === 'phone' ? (
                <>
                  <Text style={styles.label}>TELEFON NUMARAN</Text>
                  <View style={styles.phoneField}>
                    <Text style={styles.countryCode}>+90</Text>
                    <View style={styles.fieldDivider} />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="5XX XXX XX XX"
                      placeholderTextColor="#a9ada8"
                      style={styles.input}
                      accessibilityLabel="Telefon numarası"
                      returnKeyType="done"
                      onSubmitEditing={sendCode}
                    />
                  </View>
                  <Text style={styles.helper}>SMS servisi bağlanana kadar deneme kodu 1234.</Text>
                  <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={sendCode}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Kod gönder <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.label}>4 HANELİ KOD</Text>
                  <TextInput
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    placeholder="_  _  _  _"
                    placeholderTextColor="#b9bdb7"
                    style={styles.codeInput}
                    accessibilityLabel="SMS doğrulama kodu"
                    maxLength={4}
                    autoFocus
                  />
                  <Text style={styles.helper}>Kod gelmedi mi? <Text style={styles.resend} onPress={sendCode}>Tekrar gönder</Text></Text>
                  <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={signIn}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Giriş yap <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                  <Pressable style={styles.backButton} onPress={() => { setStep('phone'); setCode(''); }}><Text style={styles.backText}>← Telefon numarasını değiştir</Text></Pressable>
                </>
              )}
            </View>
          )}

          {step !== 'welcome' && <Text style={styles.privacy}>Devam ederek <Text style={styles.privacyLink}>Kullanım Koşulları</Text> ve <Text style={styles.privacyLink}>Gizlilik Politikası</Text>’nı kabul etmiş olursun.</Text>}
          <View style={styles.footer}><View style={styles.footerLine} /><Text style={styles.footerText}>GÜZEL YOLCULUKLAR BURADA BAŞLAR</Text><View style={styles.footerLine} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f4ef' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 14, paddingBottom: 24 },
  topBar: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 52, height: 40 },
  roleSwitch: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#d9dcd5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fbfaf7' },
  roleSwitchIcon: { fontSize: 19, color: '#53635a' },
  hero: { marginTop: 30, marginBottom: 28 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 17 },
  eyebrowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#db5a35' },
  eyebrowText: { color: '#777f77', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#26322d', fontSize: 43, lineHeight: 48, letterSpacing: -1.9, fontWeight: '700' },
  subtitle: { color: '#747b75', fontSize: 15, lineHeight: 23, marginTop: 16, maxWidth: 310 },
  phoneSubtitle: { marginTop: 0 },
  formCard: { padding: 22, borderRadius: 20, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e9e8e1', shadowColor: '#314039', shadowOpacity: 0.04, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  label: { color: '#777f77', fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 12 },
  phoneField: { height: 58, borderWidth: 1, borderColor: '#e0e2dc', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  countryCode: { color: '#303b35', fontSize: 15, fontWeight: '600' },
  fieldDivider: { width: 1, height: 22, backgroundColor: '#e0e2dc', marginHorizontal: 13 },
  input: { flex: 1, color: '#303b35', fontSize: 16, paddingVertical: 10 },
  helper: { color: '#959b94', fontSize: 12, marginTop: 12, marginBottom: 22 },
  primaryButton: { minHeight: 56, borderRadius: 12, backgroundColor: '#d95734', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  arrow: { fontSize: 19, fontWeight: '400' },
  codeInput: { height: 62, borderWidth: 1, borderColor: '#e0e2dc', borderRadius: 12, textAlign: 'center', fontSize: 26, letterSpacing: 12, color: '#303b35', fontWeight: '600' },
  resend: { color: '#d95734', fontWeight: '700' },
  backButton: { alignItems: 'center', marginTop: 17 },
  backText: { color: '#737b74', fontSize: 13 },
  privacy: { marginTop: 20, textAlign: 'center', color: '#999e98', fontSize: 11, lineHeight: 18, paddingHorizontal: 10 },
  privacyLink: { color: '#6b746c', textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 'auto', paddingTop: 40 },
  footerLine: { width: 22, height: 1, backgroundColor: '#d9dcd4' },
  footerText: { color: '#a0a49d', fontSize: 8, letterSpacing: 1.4, fontWeight: '700' },
  successCard: { padding: 26, borderRadius: 20, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e9e8e1', alignItems: 'center' },
  successIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e8f0e9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  successCheck: { color: '#55745f', fontSize: 26, fontWeight: '700' },
  successTitle: { color: '#26322d', fontSize: 20, fontWeight: '700' },
  successBody: { color: '#858c85', marginTop: 7, marginBottom: 22 },
  secondaryButton: { height: 48, borderRadius: 11, borderWidth: 1, borderColor: '#dfe2da', paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#43534a', fontSize: 14, fontWeight: '600' },
});
