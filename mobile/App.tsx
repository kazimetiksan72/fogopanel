import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { OneSignal } from 'react-native-onesignal';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
type Step = 'restoring' | 'phone' | 'code' | 'welcome';
type MobileSession = { token: string; expiresAt: string; user: { id: string; role: Role; phone: string } };
type Country = { flag: string; name: string; code: string };

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://fogopanel.vercel.app').replace(/\/$/, '');
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'ed2d9b4e-598e-423a-a2f8-733a4728cbab';
const SESSION_KEY = 'fogo.mobile.session';
const countries: Country[] = [
  { flag: '🇹🇷', name: 'Türkiye', code: '+90' }, { flag: '🇺🇸', name: 'ABD', code: '+1' },
  { flag: '🇬🇧', name: 'Birleşik Krallık', code: '+44' }, { flag: '🇩🇪', name: 'Almanya', code: '+49' },
  { flag: '🇫🇷', name: 'Fransa', code: '+33' }, { flag: '🇳🇱', name: 'Hollanda', code: '+31' },
  { flag: '🇧🇪', name: 'Belçika', code: '+32' }, { flag: '🇦🇹', name: 'Avusturya', code: '+43' },
  { flag: '🇨🇭', name: 'İsviçre', code: '+41' }, { flag: '🇮🇹', name: 'İtalya', code: '+39' },
  { flag: '🇪🇸', name: 'İspanya', code: '+34' }, { flag: '🇵🇹', name: 'Portekiz', code: '+351' },
  { flag: '🇬🇷', name: 'Yunanistan', code: '+30' }, { flag: '🇷🇺', name: 'Rusya', code: '+7' },
  { flag: '🇦🇪', name: 'Birleşik Arap Emirlikleri', code: '+971' }, { flag: '🇸🇦', name: 'Suudi Arabistan', code: '+966' },
  { flag: '🇦🇿', name: 'Azerbaycan', code: '+994' }, { flag: '🇨🇾', name: 'Kıbrıs', code: '+357' },
  { flag: '🇮🇳', name: 'Hindistan', code: '+91' }, { flag: '🇵🇰', name: 'Pakistan', code: '+92' },
  { flag: '🇨🇳', name: 'Çin', code: '+86' }, { flag: '🇯🇵', name: 'Japonya', code: '+81' },
  { flag: '🇰🇷', name: 'Güney Kore', code: '+82' }, { flag: '🇦🇺', name: 'Avustralya', code: '+61' },
  { flag: '🇳🇿', name: 'Yeni Zelanda', code: '+64' }, { flag: '🇧🇷', name: 'Brezilya', code: '+55' },
  { flag: '🇲🇽', name: 'Meksika', code: '+52' }, { flag: '🇮🇱', name: 'İsrail', code: '+972' },
  { flag: '🇮🇷', name: 'İran', code: '+98' }, { flag: '🇺🇦', name: 'Ukrayna', code: '+380' },
  { flag: '🇵🇱', name: 'Polonya', code: '+48' }, { flag: '🇸🇪', name: 'İsveç', code: '+46' },
  { flag: '🇳🇴', name: 'Norveç', code: '+47' }, { flag: '🇩🇰', name: 'Danimarka', code: '+45' },
  { flag: '🇮🇪', name: 'İrlanda', code: '+353' }, { flag: '🇷🇴', name: 'Romanya', code: '+40' },
  { flag: '🇧🇬', name: 'Bulgaristan', code: '+359' }, { flag: '🇭🇺', name: 'Macaristan', code: '+36' },
  { flag: '🇭🇷', name: 'Hırvatistan', code: '+385' }, { flag: '🇲🇦', name: 'Fas', code: '+212' },
  { flag: '🇪🇬', name: 'Mısır', code: '+20' },
];

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('90')) return `+${digits}`;
  return `+${digits}`;
}

function formatTurkishPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  return digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
}

function toInternationalPhone(countryCode: string, nationalPhone: string) {
  let digits = nationalPhone.replace(/\D/g, '');
  if (countryCode === '+90') digits = digits.replace(/^0/, '');
  return normalizePhone(`${countryCode}${digits}`);
}

function phoneParts(value: string) {
  const digits = value.replace(/\D/g, '');
  const country = [...countries].sort((a, b) => b.code.length - a.code.length)
    .find((item) => digits.startsWith(item.code.slice(1)));
  if (country) return { code: country.code, phone: digits.slice(country.code.length - 1) };
  return { code: '+90', phone: digits.replace(/^90/, '').replace(/^0/, '') };
}

async function requestCode(phone: string, role: Role) {
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
  const response = await fetch(`${API_URL}/api/mobile/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role, code }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Kod doğrulanamadı.');
  return result as MobileSession;
}

async function refreshSession(token: string) {
  const response = await fetch(`${API_URL}/api/mobile/auth/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Oturum yenilenemedi.') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return result as MobileSession;
}

export default function App() {
  const [role, setRole] = useState<Role>('participant');
  const [step, setStep] = useState<Step>('restoring');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+90');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const sessionRef = useRef<MobileSession | null>(null);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    if (ONESIGNAL_APP_ID) OneSignal.initialize(ONESIGNAL_APP_ID);
  }, []);

  async function connectPushUser(session: MobileSession) {
    if (!ONESIGNAL_APP_ID) return;
    try {
      OneSignal.login(session.user.id);
      OneSignal.User.addTag('role', session.user.role);
      if (await OneSignal.Notifications.canRequestPermission()) {
        await OneSignal.Notifications.requestPermission(false);
      }
    } catch (error) {
      console.warn('OneSignal kaydı tamamlanamadı:', error);
    }
  }

  async function saveSession(session: MobileSession) {
    sessionRef.current = session;
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }

  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        const stored = await SecureStore.getItemAsync(SESSION_KEY);
        if (!stored) { if (mounted) setStep('phone'); return; }
        const previous = JSON.parse(stored) as MobileSession;
        if (!previous.token) throw new Error('Oturum bilgisi geçersiz.');
        try {
          const session = await refreshSession(previous.token);
          if (!session.token || !session.user?.id || !session.user?.role) throw new Error('Oturum yanıtı geçersiz.');
          await saveSession(session);
          void connectPushUser(session);
          if (mounted) {
            setRole(session.user.role);
            const phoneInfo = phoneParts(session.user.phone);
            setCountryCode(phoneInfo.code);
            setPhone(phoneInfo.phone);
            setStep('welcome');
          }
        } catch (error) {
          if ((error as Error & { status?: number }).status === 401) {
            sessionRef.current = null;
            await SecureStore.deleteItemAsync(SESSION_KEY);
          } else if (mounted) {
            setRestoreError('Oturum kontrol edilemedi. Bağlantınızı kontrol edip tekrar giriş yapın.');
          }
          if (mounted) setStep('phone');
        }
      } catch {
        if (mounted) { setRestoreError('Güvenli oturum alanı açılamadı.'); setStep('phone'); }
      }
    }
    restore();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active' || !sessionRef.current || refreshInFlight.current) return;
      refreshInFlight.current = true;
      try {
        const next = await refreshSession(sessionRef.current.token);
        await saveSession(next);
      } catch (error) {
        const status = (error as Error & { status?: number }).status;
        if (status === 401) {
          sessionRef.current = null;
          await SecureStore.deleteItemAsync(SESSION_KEY);
          setStep('phone');
          setRestoreError('Oturum süresi doldu. Telefon numaranızla yeniden giriş yapın.');
        }
      } finally {
        refreshInFlight.current = false;
      }
    });
    return () => subscription.remove();
  }, []);

  const isGuide = role === 'guide';

  function toggleRole() {
    setRole((current) => current === 'participant' ? 'guide' : 'participant');
    setStep('phone');
    setCode('');
    setRestoreError('');
  }

  function selectCountry(country: Country) {
    setCountryCode(country.code);
    setCountryPickerOpen(false);
    setPhone((current) => country.code === '+90' ? formatTurkishPhone(current) : current.replace(/\D/g, ''));
  }

  async function sendCode() {
    const internationalPhone = toInternationalPhone(countryCode, phone);
    const digits = internationalPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      Alert.alert('Telefon numarası', 'Geçerli bir telefon numarası girin.');
      return;
    }
    setBusy(true);
    try {
      await requestCode(internationalPhone, role);
      setStep('code');
    } catch (error) {
      Alert.alert('Kod gönderilemedi', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (code.length !== 6) {
      Alert.alert('Doğrulama kodu', '6 haneli kodu girin.');
      return;
    }
    setBusy(true);
    try {
      const session = await verifyCode(toInternationalPhone(countryCode, phone), role, code);
      if (!session.token || !session.user?.id || session.user.role !== role) throw new Error('Oturum yanıtı geçersiz.');
      await saveSession(session);
      setStep('welcome');
      void connectPushUser(session);
    } catch (error) {
      Alert.alert('Giriş yapılamadı', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      const session = sessionRef.current;
      if (ONESIGNAL_APP_ID) OneSignal.logout();
      if (session) {
        await fetch(`${API_URL}/api/mobile/auth/signout`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }).catch(() => {});
      }
      sessionRef.current = null;
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setStep('phone');
      setCode('');
      setPhone('');
      setCountryCode('+90');
    } catch { Alert.alert('Çıkış yapılamadı', 'Güvenli oturum alanına erişilemedi.'); }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Image source={require('./assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Fogo" />
            {step !== 'welcome' && step !== 'restoring' && (
              <Pressable accessibilityRole="button" accessibilityLabel={isGuide ? 'Katılımcı girişine geç' : 'Rehber girişine geç'} onPress={toggleRole} style={styles.roleSwitch}>
                <Text style={styles.roleSwitchIcon}>{isGuide ? '♙' : '♧'}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.hero}>
            {(step === 'welcome' || step === 'code' || (step === 'phone' && isGuide)) && <Text style={styles.title}>{step === 'welcome' ? 'Harika,\nhazırsın.' : step === 'code' ? 'Telefonunu\ndoğrula.' : 'Rehber girişi'}</Text>}
            {(step === 'welcome' || step === 'code') && (
              <Text style={styles.subtitle}>
                {step === 'welcome'
                  ? `${isGuide ? 'Rehber' : 'Katılımcı'} olarak giriş yaptın.`
                  : step === 'code'
                    ? `${countryCode} ${phone} numarası için 6 haneli kodu gir.`
                  : ''}
              </Text>
            )}
          </View>

          {step === 'restoring' ? <ActivityIndicator color="#d95734" size="large" /> : step === 'welcome' ? (
            <View style={styles.successCard}>
              <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
              <Text style={styles.successTitle}>Giriş başarılı</Text>
              <Text style={styles.successBody}>{toInternationalPhone(countryCode, phone)}</Text>
              <Pressable style={styles.secondaryButton} onPress={signOut}>
                <Text style={styles.secondaryButtonText}>Çıkış yap</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formCard}>
              {step === 'phone' ? (
                <>
                  <Text style={styles.label}>TELEFON NUMARAN</Text>
                  <View style={styles.phoneField}>
                    <Pressable style={styles.countryPickerButton} onPress={() => setCountryPickerOpen(true)} accessibilityRole="button" accessibilityLabel={`Ülke kodu ${countryCode}, ülke seç`}>
                      <Text style={styles.countryFlag}>{countries.find((item) => item.code === countryCode)?.flag || '🌐'}</Text>
                      <Text style={styles.countryCode}>{countryCode}</Text>
                      <Text style={styles.countryChevron}>⌄</Text>
                    </Pressable>
                    <View style={styles.fieldDivider} />
                    <TextInput
                      value={phone}
                      onChangeText={(value) => setPhone(countryCode === '+90' ? formatTurkishPhone(value) : value.replace(/\D/g, ''))}
                      keyboardType="phone-pad"
                      placeholder={countryCode === '+90' ? '5XX XXXXXXX' : 'Telefon numarası'}
                      placeholderTextColor="#a9ada8"
                      style={styles.input}
                      accessibilityLabel="Telefon numarası"
                      maxLength={countryCode === '+90' ? 11 : 24}
                      returnKeyType="done"
                      onSubmitEditing={sendCode}
                    />
                  </View>
                  <Modal visible={countryPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryPickerOpen(false)}>
                    <Pressable style={styles.countryModalBackdrop} onPress={() => setCountryPickerOpen(false)}>
                      <Pressable style={styles.countryModalCard} onPress={(event) => event.stopPropagation()}>
                        <Text style={styles.countryModalTitle}>Ülke seçin</Text>
                        <ScrollView keyboardShouldPersistTaps="handled">
                          {countries.map((country) => <Pressable key={country.code} style={styles.countryOption} onPress={() => selectCountry(country)}>
                            <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                            <Text style={styles.countryOptionName}>{country.name}</Text>
                            <Text style={styles.countryOptionCode}>{country.code}</Text>
                          </Pressable>)}
                        </ScrollView>
                      </Pressable>
                    </Pressable>
                  </Modal>
                  {restoreError ? <Text style={styles.helper}>{restoreError}</Text> : <Text style={styles.helper}>Giriş için telefon numaranı gir.</Text>}
                  <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={sendCode}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Kod gönder <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.label}>6 HANELİ KOD</Text>
                  <TextInput
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    placeholder="_  _  _  _  _  _"
                    placeholderTextColor="#b9bdb7"
                    style={styles.codeInput}
                    accessibilityLabel="SMS doğrulama kodu"
                    maxLength={6}
                    autoFocus
                  />
                  <Text style={styles.helper}>Geçici doğrulama kodu: 123456</Text>
                  <Text style={styles.helper}>Kod gelmedi mi? <Text style={styles.resend} onPress={sendCode}>Tekrar gönder</Text></Text>
                  <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={signIn}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Giriş yap <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                  <Pressable style={styles.backButton} onPress={() => { setStep('phone'); setCode(''); }}><Text style={styles.backText}>← Telefon numarasını değiştir</Text></Pressable>
                </>
              )}
            </View>
          )}

          {step !== 'welcome' && step !== 'restoring' && <Text style={styles.privacy}>Devam ederek <Text style={styles.privacyLink}>Kullanım Koşulları</Text> ve <Text style={styles.privacyLink}>Gizlilik Politikası</Text>’nı kabul etmiş olursun.</Text>}
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
  countryPickerButton: { height: '100%', flexDirection: 'row', alignItems: 'center', gap: 4 },
  countryFlag: { fontSize: 19 },
  countryCode: { color: '#303b35', fontSize: 14, fontWeight: '600' },
  countryChevron: { color: '#858c84', fontSize: 14, marginLeft: 1 },
  fieldDivider: { width: 1, height: 22, backgroundColor: '#e0e2dc', marginHorizontal: 13 },
  input: { flex: 1, color: '#303b35', fontSize: 16, paddingVertical: 10 },
  countryModalBackdrop: { flex: 1, backgroundColor: '#10181470', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 50 },
  countryModalCard: { maxHeight: '80%', borderRadius: 18, backgroundColor: '#fffefa', paddingHorizontal: 18, paddingTop: 20, paddingBottom: 10 },
  countryModalTitle: { color: '#26322d', fontSize: 18, fontWeight: '700', paddingBottom: 12 },
  countryOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#efeee9', gap: 11 },
  countryOptionFlag: { width: 28, fontSize: 20 },
  countryOptionName: { flex: 1, color: '#303b35', fontSize: 14 },
  countryOptionCode: { color: '#778078', fontSize: 13, fontWeight: '600' },
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
