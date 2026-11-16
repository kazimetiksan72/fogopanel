import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { OneSignal } from 'react-native-onesignal';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
type Step = 'restoring' | 'phone' | 'code' | 'profile' | 'welcome';
type MobileSession = { token: string; expiresAt: string; user: { id: string; role: Role; phone: string; fullName?: string } };
type TourSummary = { id: string; name: string; startDate: string; endDate: string; dayCount?: number };
type TourDetail = TourSummary & { dayPlans: { date: string; visits: { placeId: string; note?: string }[] }[]; participantCount: number };
type VerifyResult = MobileSession | { profileRequired: true };
type AppScreen = 'home' | 'guideDetail' | 'scanner';
type Country = { flag: string; name: string; code: string };

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://fogopanel.vercel.app').replace(/\/$/, '');
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'ed2d9b4e-598e-423a-a2f8-733a4728cbab';
const SESSION_KEY = 'fogo.mobile.session';
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Sunucu yanıt vermedi. Ağ bağlantısını kontrol edip tekrar deneyin.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
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

function formatTourDates(tour: Pick<TourSummary, 'startDate' | 'endDate'>) {
  if (!tour.startDate) return 'Tarih belirtilmedi';
  const date = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
  };
  return tour.startDate === tour.endDate ? date(tour.startDate) : `${date(tour.startDate)} – ${date(tour.endDate)}`;
}

async function requestCode(phone: string, role: Role) {
  const response = await fetchWithTimeout(`${API_URL}/api/mobile/auth/request-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Kod gönderilemedi.');
  return result;
}

async function verifyCode(phone: string, role: Role, code: string, fullName?: string) {
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
  const response = await fetchWithTimeout(`${API_URL}/api/mobile/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role, code, ...(normalizedName ? { fullName: normalizedName } : {}) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Kod doğrulanamadı.');
  return result as VerifyResult;
}

async function getMobileTours(token: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/mobile/tours`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Turlar yüklenemedi.');
  return result.tours as TourSummary[];
}

async function getGuideTour(token: string, id: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/mobile/tours/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Tur ayrıntıları yüklenemedi.');
  return result.tour as TourDetail;
}

async function refreshSession(token: string) {
  const response = await fetchWithTimeout(`${API_URL}/api/mobile/auth/refresh`, {
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
  const [stepStack, setStepStack] = useState<Step[]>(['restoring']);
  const step = stepStack[stepStack.length - 1];
  const setStep = (next: Step) => setStepStack((current) => {
    if (next === 'phone' || next === 'welcome' || next === 'restoring') return [next];
    if (current[current.length - 1] === next) return current;
    return [...current, next];
  });
  const [phone, setPhone] = useState('');
  const [profileName, setProfileName] = useState('');
  const [userName, setUserName] = useState('');
  const [countryCode, setCountryCode] = useState('+90');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [screen, setScreen] = useState<AppScreen>('home');
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [selectedTour, setSelectedTour] = useState<TourDetail | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [qrVisible, setQrVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const sessionRef = useRef<MobileSession | null>(null);
  const codeInputRef = useRef<TextInput>(null);
  const refreshInFlight = useRef(false);
  const scanInFlight = useRef(false);

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
          if (mounted) {
            setRole(session.user.role);
            setUserName(session.user.fullName || '');
            const phoneInfo = phoneParts(session.user.phone);
            setCountryCode(phoneInfo.code);
            setPhone(phoneInfo.phone);
            setScreen('home');
            setStep('welcome');
            void getMobileTours(session.token).then(setTours).catch(() => setTours([]));
            void connectPushUser(session);
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

  async function finishLogin(session: MobileSession) {
    await saveSession(session);
    setRole(session.user.role);
    setUserName(session.user.fullName || '');
    setScreen('home');
    setSelectedTour(null);
    setTours(await getMobileTours(session.token).catch(() => []));
    setStep('welcome');
    void connectPushUser(session);
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

  async function openLegalPage(path: string) {
    try {
      await Linking.openURL(`https://fogopanel.vercel.app/${path}`);
    } catch {
      Alert.alert('Sayfa açılamadı', 'Yasal bilgilendirme sayfası şu anda açılamıyor.');
    }
  }

  async function signIn(fullName?: string) {
    Keyboard.dismiss();
    codeInputRef.current?.blur();
    if (code.length !== 6) {
      Alert.alert('Doğrulama kodu', '6 haneli kodu girin.');
      return;
    }
    setBusy(true);
    try {
      const result = await verifyCode(toInternationalPhone(countryCode, phone), role, code, fullName);
      if ('profileRequired' in result) {
        setStep('profile');
        return;
      }
      const session = result;
      if (!session.token || !session.user?.id || session.user.role !== role) throw new Error('Oturum yanıtı geçersiz.');
      await finishLogin(session);
    } catch (error) {
      Alert.alert('Giriş yapılamadı', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function openScanner() {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Kamera izni gerekli', 'Tura katılmak için kamera erişimine izin verin.');
        return;
      }
    }
    scanInFlight.current = false;
    setScreen('scanner');
  }

  async function handleQrScanned(value: string) {
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    try {
      const session = sessionRef.current;
      if (!session) throw new Error('Oturum açmanız gerekiyor.');
      const response = await fetch(`${API_URL}/api/mobile/tours/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ qrCode: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Tura katılım tamamlanamadı.');
      setScreen('home');
      setTours(await getMobileTours(session.token));
      Alert.alert(result.alreadyJoined ? 'Tur zaten listende' : 'Tura katıldın', result.tour?.name || 'Tur listen güncellendi.');
    } catch (error) {
      setScreen('home');
      Alert.alert('QR kod okunamadı', error instanceof Error ? error.message : 'Tekrar deneyin.');
    }
  }

  async function openGuideTour(tour: TourSummary) {
    const session = sessionRef.current;
    if (!session) return;
    setBusy(true);
    try {
      setSelectedTour(await getGuideTour(session.token, tour.id));
      setQrCode('');
      setScreen('guideDetail');
    } catch (error) {
      Alert.alert('Tur açılamadı', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally { setBusy(false); }
  }

  async function createTourQr() {
    const session = sessionRef.current;
    if (!session || !selectedTour) return;
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/mobile/tours/${selectedTour.id}/qr`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'QR kod oluşturulamadı.');
      setQrCode(result.qrCode);
      setQrVisible(true);
    } catch (error) {
      Alert.alert('QR kod oluşturulamadı', error instanceof Error ? error.message : 'Tekrar deneyin.');
    } finally { setBusy(false); }
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
            {(step === 'code' || (step === 'phone' && isGuide)) && <Text style={[styles.title, step === 'code' && styles.codeTitle]}>{step === 'code' ? 'Telefonunu\ndoğrula.' : 'Rehber girişi'}</Text>}
            {step === 'profile' && <Text style={styles.subtitle}>Tur listende görünmesi için ad soyad bilgini ekle.</Text>}
          </View>

          {step === 'restoring' ? <ActivityIndicator color="#d95734" size="large" /> : step === 'welcome' ? (
            screen === 'scanner' ? <View style={styles.homePanel}>
              <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tur QR kodunu okut</Text><Pressable onPress={() => setScreen('home')}><Text style={styles.backText}>Kapat</Text></Pressable></View>
              <View style={styles.cameraFrame}>
                <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { void handleQrScanned(data); }} />
                <View pointerEvents="none" style={styles.cameraGuide} />
              </View>
              <Text style={styles.helper}>Rehberin tur için oluşturduğu QR kodu çerçevenin içine getirin.</Text>
            </View> : screen === 'guideDetail' && selectedTour ? <View style={styles.homePanel}>
              <Pressable style={styles.backButton} onPress={() => { setScreen('home'); setQrCode(''); }}><Text style={styles.backText}>‹ Turlarıma dön</Text></Pressable>
              <Text style={styles.sectionTitle}>{selectedTour.name}</Text>
              <Text style={styles.tourDates}>{formatTourDates(selectedTour)}</Text>
              <View style={styles.tourStats}><Text style={styles.tourStat}>{selectedTour.participantCount} katılımcı</Text><Text style={styles.tourStat}>{selectedTour.dayPlans.length} tur günü</Text></View>
              {selectedTour.dayPlans.map((day, index) => <View style={styles.detailDay} key={`${day.date}-${index}`}>
                <Text style={styles.detailDayTitle}>{formatTourDates({ startDate: day.date, endDate: day.date })}</Text>
                {day.visits.length ? day.visits.map((visit, visitIndex) => <MobileTourVisit key={`${visit.placeId}-${visitIndex}`} visit={visit} token={sessionRef.current?.token || ''} index={visitIndex} />)
                  : <Text style={styles.detailDayBody}>Ziyaret noktası eklenmemiş</Text>}
              </View>)}
              <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={createTourQr}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>QR kod oluştur <Text style={styles.arrow}>→</Text></Text>}
              </Pressable>
            </View> : <View style={styles.homePanel}>
              {!isGuide ? <>
                <Text style={styles.welcomeHeading}>Hoşgeldiniz</Text>
                <Text style={styles.welcomeName}>{userName || 'Katılımcı'}</Text>
                <Pressable style={[styles.primaryButton, styles.joinTourButton]} onPress={() => { void openScanner(); }}>
                  <Text style={styles.primaryButtonText}>Tura Katıl <Text style={styles.arrow}>→</Text></Text>
                </Pressable>
                <Text style={styles.sectionTitle}>Turlarım</Text>
                {tours.length ? tours.map((tour) => <View key={tour.id} style={styles.tourCard}>
                  <Text style={styles.tourCardTitle}>{tour.name}</Text><Text style={styles.tourDates}>{formatTourDates(tour)}</Text>
                </View>) : <Text style={styles.emptyText}>Henüz bir tura katılmadınız.</Text>}
              </> : <>
                <Text style={styles.welcomeHeading}>Merhaba</Text>
                <Text style={styles.welcomeName}>{userName || 'Rehber'}</Text>
                <Text style={styles.sectionTitle}>Turlarım</Text>
                {tours.length ? tours.map((tour) => <Pressable key={tour.id} style={styles.tourCard} onPress={() => { void openGuideTour(tour); }}>
                  <View style={styles.tourCardRow}><Text style={styles.tourCardTitle}>{tour.name}</Text><Text style={styles.tourArrow}>›</Text></View>
                  <Text style={styles.tourDates}>{formatTourDates(tour)}</Text><Text style={styles.tourDayCount}>{tour.dayCount || 0} tur günü</Text>
                </Pressable>) : <Text style={styles.emptyText}>Size atanmış tur bulunmuyor.</Text>}
              </>}
              <Pressable style={styles.secondaryButton} onPress={signOut}><Text style={styles.secondaryButtonText}>Çıkış yap</Text></Pressable>
            </View>
          ) : (
            <View style={styles.formCard}>
              {step === 'phone' ? (
                <>
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
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Giriş Yap <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                </>
              ) : step === 'code' ? (
                <>
                  <Text style={styles.label}>6 HANELİ KOD</Text>
                  <TextInput
                    ref={codeInputRef}
                    value={code}
                    onChangeText={(value) => {
                      const nextCode = value.replace(/\D/g, '').slice(0, 6);
                      setCode(nextCode);
                      if (nextCode.length === 6) {
                        Keyboard.dismiss();
                        codeInputRef.current?.blur();
                      }
                    }}
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
                  <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={() => { void signIn(); }}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Giriş yap <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                  <Pressable style={styles.backButton} onPress={() => { setStep('phone'); setCode(''); }}><Text style={styles.backText}>← Telefon numarasını değiştir</Text></Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.label}>AD SOYAD</Text>
                  <TextInput value={profileName} onChangeText={setProfileName} autoCapitalize="words" autoComplete="name" placeholder="Ad Soyad" placeholderTextColor="#a9ada8" style={styles.profileNameInput} accessibilityLabel="Ad Soyad" maxLength={160} returnKeyType="done" />
                  <Text style={styles.helper}>Telefon numaran doğrulandı. Katılımcı profilini tamamlamak için ad soyadını yaz.</Text>
                  <Pressable disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={() => { void signIn(profileName); }}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Hesabı oluştur <Text style={styles.arrow}>→</Text></Text>}
                  </Pressable>
                </>
              )}
            </View>
          )}

          <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
            <Pressable style={styles.qrModalBackdrop} onPress={() => setQrVisible(false)}>
              <Pressable style={styles.qrModalCard} onPress={(event) => event.stopPropagation()}>
                <Text style={styles.qrModalTitle}>Tur katılım QR kodu</Text>
                <Text style={styles.qrModalSubtitle}>{selectedTour?.name}</Text>
                {qrCode ? <QRCode value={qrCode} size={220} backgroundColor="#ffffff" color="#18231e" /> : null}
                <Text style={styles.qrModalHint}>Katılımcılar bu kodu uygulamalarından okutarak tura katılabilir. Basılı kopya için ekran görüntüsü alın.</Text>
                <Pressable style={styles.secondaryButton} onPress={() => setQrVisible(false)}><Text style={styles.secondaryButtonText}>Kapat</Text></Pressable>
              </Pressable>
            </Pressable>
          </Modal>

          {step !== 'welcome' && step !== 'restoring' && <Text style={styles.privacy}>
            FOGO, telefon numaranı giriş ve tur hizmetlerini sunmak için işler; devam ederek <Text accessibilityRole="link" style={styles.privacyLink} onPress={() => { void openLegalPage('kullanim-kosullari'); }}>Kullanım Koşulları</Text>’nı kabul etmiş, <Text accessibilityRole="link" style={styles.privacyLink} onPress={() => { void openLegalPage('gizlilik-politikasi'); }}>Gizlilik Politikası</Text> ve <Text accessibilityRole="link" style={styles.privacyLink} onPress={() => { void openLegalPage('kvkk-bildirimi'); }}>KVKK Bildirimi</Text> hakkında bilgilendirilmiş olursun.
          </Text>}
          <View style={styles.footer}><View style={styles.footerLine} /><Text style={styles.footerText}>GÜZEL YOLCULUKLAR BURADA BAŞLAR</Text><View style={styles.footerLine} /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MobileTourVisit({ visit, token, index }: { visit: { placeId: string; note?: string }; token: string; index: number }) {
  const [place, setPlace] = useState<{ name: string; address: string } | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/mobile/places/${encodeURIComponent(visit.placeId)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Yer yüklenemedi.');
        if (active) setPlace({ name: result.name, address: result.address || '' });
      })
      .catch(() => { if (active) setPlace({ name: 'Yer bilgisi alınamadı', address: '' }); });
    return () => { active = false; };
  }, [token, visit.placeId]);
  return <View style={styles.mobileTourVisit}>
    <Text style={styles.mobileTourVisitTitle}>{index + 1}. {place?.name || 'Yer bilgisi yükleniyor…'}</Text>
    {place?.address ? <Text style={styles.detailDayBody}>{place.address}</Text> : null}
    {visit.note ? <Text style={styles.detailDayBody}>{visit.note}</Text> : null}
  </View>;
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
  codeTitle: { fontSize: 34, lineHeight: 39, letterSpacing: -1.2 },
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
  profileNameInput: { height: 56, borderWidth: 1, borderColor: '#e0e2dc', borderRadius: 12, paddingHorizontal: 14, color: '#303b35', fontSize: 16 },
  primaryButton: { minHeight: 56, borderRadius: 12, backgroundColor: '#d95734', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  arrow: { fontSize: 19, fontWeight: '400' },
  codeInput: { height: 62, borderWidth: 1, borderColor: '#e0e2dc', borderRadius: 12, textAlign: 'center', fontSize: 26, letterSpacing: 12, color: '#303b35', fontWeight: '600' },
  resend: { color: '#d95734', fontWeight: '700' },
  backButton: { alignItems: 'center', marginTop: 17 },
  backText: { color: '#737b74', fontSize: 13 },
  homePanel: { padding: 22, borderRadius: 20, backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e9e8e1', shadowColor: '#314039', shadowOpacity: 0.04, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  welcomeHeading: { color: '#26322d', fontSize: 27, lineHeight: 34, fontWeight: '700' },
  welcomeName: { color: '#d95734', fontSize: 25, lineHeight: 32, fontWeight: '700', marginBottom: 22 },
  joinTourButton: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { color: '#26322d', fontSize: 19, lineHeight: 26, fontWeight: '700', marginTop: 4, marginBottom: 14 },
  tourCard: { borderWidth: 1, borderColor: '#eceae4', borderRadius: 13, padding: 15, marginBottom: 10, backgroundColor: '#fff' },
  tourCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tourCardTitle: { flex: 1, color: '#26322d', fontSize: 15, fontWeight: '700' },
  tourArrow: { color: '#d95734', fontSize: 26 },
  tourDates: { color: '#788078', fontSize: 12, marginTop: 7 },
  tourDayCount: { color: '#a0a59e', fontSize: 11, marginTop: 5 },
  emptyText: { color: '#959b94', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  tourStats: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  tourStat: { color: '#69756b', fontSize: 12, fontWeight: '600', backgroundColor: '#f1f3ed', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  detailDay: { borderTopWidth: 1, borderTopColor: '#efeee9', paddingVertical: 12 },
  detailDayTitle: { color: '#35413a', fontSize: 13, fontWeight: '700' },
  detailDayBody: { color: '#90978f', fontSize: 12, marginTop: 5 },
  mobileTourVisit: { borderTopWidth: 1, borderTopColor: '#f2f0eb', paddingVertical: 9 },
  mobileTourVisitTitle: { color: '#35413a', fontSize: 13, fontWeight: '600' },
  cameraFrame: { width: '100%', height: 420, overflow: 'hidden', borderRadius: 16, backgroundColor: '#1b251f' },
  camera: { flex: 1 },
  cameraGuide: { position: 'absolute', width: 220, height: 220, left: '50%', top: '50%', marginLeft: -110, marginTop: -110, borderWidth: 2, borderColor: '#fff', borderRadius: 20 },
  qrModalBackdrop: { flex: 1, backgroundColor: '#10181480', justifyContent: 'center', padding: 24 },
  qrModalCard: { alignItems: 'center', borderRadius: 20, backgroundColor: '#fffefa', padding: 24 },
  qrModalTitle: { color: '#26322d', fontSize: 19, fontWeight: '700', textAlign: 'center' },
  qrModalSubtitle: { color: '#747b75', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  qrModalHint: { color: '#8c938c', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 17, marginBottom: 19 },
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
