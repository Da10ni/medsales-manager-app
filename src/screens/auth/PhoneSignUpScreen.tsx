import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  Alert,
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Title,
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import countries from 'world-countries';
import {
  sendVerificationCode,
  verifyPhoneNumber,
  getManagerByPhone,
} from '../../services/phoneAuthService';
import { useDispatch } from 'react-redux';
import { setManager } from '../../redux/slices/authSlice';

interface PhoneSignUpScreenProps {
  navigation: any;
}

export default function PhoneSignUpScreen({ navigation }: PhoneSignUpScreenProps) {
  const theme = useTheme();
  const dispatch = useDispatch();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
  const [selectedCountryPhoneCode, setSelectedCountryPhoneCode] = useState<string>('');
  const [showCountryPickerModal, setShowCountryPickerModal] = useState<boolean>(false);
  const [searchCountry, setSearchedCountry] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const filteredCountries = countries
    .filter(
      (country) =>
        country.name.common.toLowerCase().includes(searchCountry.toLowerCase()) ||
        country.cca2.toLowerCase().includes(searchCountry.toLowerCase())
    )
    .sort((a, b) => a.name.common.localeCompare(b.name.common));

  function getFormattedPhoneCode(countryCode: any) {
    const country = countries.find(
      (c) => c.cca2?.toLowerCase() === countryCode?.toLowerCase()
    );
    if (!country || !country.idd.root) return null;

    const root = country.idd.root;
    const suffix = country.idd.suffixes?.[0] || '';
    return root + suffix;
  }

  useMemo(() => {
    const initialCountry: any = countries.find((country) =>
      country.altSpellings.includes('PK')
    );
    setSelectedCountry(initialCountry);
    setSelectedCountryCode(initialCountry?.cca2);
    setSelectedCountryPhoneCode(getFormattedPhoneCode(initialCountry?.cca2) || '+92');
  }, []);

  const startResendCountdown = () => {
    setCanResend(false);
    setCountdown(60);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCodeInternal = async () => {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const fullPhoneNumber = `${selectedCountryPhoneCode}${cleanPhoneNumber}`;

      console.log('Sending code to:', fullPhoneNumber);

      const result = await sendVerificationCode(fullPhoneNumber);

      if (result.success) {
        setCodeSent(true);
        startResendCountdown();

        // Show the code in alert for testing (remove in production)
        Alert.alert(
          'Code Sent!',
          `Your verification code is: ${result.code}\n\n(This is for testing only. In production, this will be sent via SMS)`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err.message || 'Failed to send verification code');
      Alert.alert('Error', err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    if (!isAgreed) {
      setShowTermsPopup(true);
      return;
    }

    await sendCodeInternal();
  };

  const handleTermsPopupOk = async () => {
    setIsAgreed(true);
    setShowTermsPopup(false);
    setTimeout(async () => {
      await sendCodeInternal();
    }, 100);
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const fullPhoneNumber = `${selectedCountryPhoneCode}${cleanPhoneNumber}`;

      console.log('📱 Verifying code for:', fullPhoneNumber);
      console.log('🔢 Entered code:', verificationCode);

      const result = await verifyPhoneNumber(fullPhoneNumber, verificationCode);

      console.log('✅ Phone verified! isCreated:', result.isCreated);

      // Navigate based on whether user is new or existing
      if (result.isCreated) {
        // New user - navigate to profile setup
        navigation.navigate('ProfileSetup', { phoneNumber: result.user.uid });
      } else {
        // Existing user - load profile and show welcome back
        const managerData = await getManagerByPhone(result.user.uid);

        if (managerData) {
          console.log('✅ Profile loaded:', managerData);

          // Save to Redux store - this will trigger navigation automatically
          dispatch(setManager(managerData));

          // Show success message
          Alert.alert('Success', 'Welcome back! You have been logged in successfully.');
        } else {
          throw new Error('Failed to load profile. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.message || 'Failed to verify code');
      Alert.alert('Error', err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) {
      Alert.alert('Error', 'Please wait before requesting another code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const fullPhoneNumber = `${selectedCountryPhoneCode}${cleanPhoneNumber}`;

      const result = await sendVerificationCode(fullPhoneNumber);

      if (result.success) {
        startResendCountdown();

        // Show the code in alert for testing (remove in production)
        Alert.alert(
          'Code Resent!',
          `Your new verification code is: ${result.code}\n\n(This is for testing only. In production, this will be sent via SMS)`,
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(err.message || 'Failed to resend verification code');
      Alert.alert('Error', err.message || 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhoneInput = () => {
    setCodeSent(false);
    setError(null);
    setVerificationCode('');
    setCanResend(true);
    setCountdown(0);
  };

  const renderCountryItem = ({ item }: { item: any }) => {
    const code = item.cca2.toUpperCase();
    return (
      <RNTouchableOpacity
        style={styles.countryItem}
        onPress={() => {
          setSelectedCountry(item);
          setSelectedCountryCode(item?.cca2);
          setShowCountryPickerModal(false);
          setSearchedCountry('');
          const formattedPhoneCode = getFormattedPhoneCode(item?.cca2);
          setSelectedCountryPhoneCode(formattedPhoneCode || '');
        }}
      >
        <Text style={styles.countryFlag}>{code}</Text>
        <Text style={styles.countryName}>{item.name.common}</Text>
        <Text style={styles.countryCode}>{getFormattedPhoneCode(item.cca2)}</Text>
      </RNTouchableOpacity>
    );
  };

  const isButtonEnabled = codeSent
    ? verificationCode.length === 6
    : phoneNumber.length >= 10 && phoneNumber.length <= 15;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        {/* Terms Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showTermsPopup}
          onRequestClose={() => setShowTermsPopup(false)}
        >
          <View style={styles.termsModalOverlay}>
            <View style={styles.termsModalContainer}>
              <View style={styles.termsModalContent}>
                <View style={styles.termsIconContainer}>
                  <Text style={styles.termsIcon}>📋</Text>
                </View>
                <Title style={styles.termsModalTitle}>Terms & Conditions</Title>
                <Text style={styles.termsModalMessage}>
                  Please accept our Terms & Conditions to continue with creating your MedSales
                  account.
                </Text>
                <View style={styles.termsButtonContainer}>
                  <Button
                    mode="contained"
                    onPress={handleTermsPopupOk}
                    style={styles.termsOkButton}
                  >
                    Accept & Continue
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Header */}
        <View style={styles.header}>
          <RNTouchableOpacity
            onPress={codeSent ? handleBackToPhoneInput : () => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </RNTouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Title style={styles.title}>
              {codeSent ? 'Verify Your Phone ✨' : 'Join MedSales Today ✨'}
            </Title>
            <Text style={styles.subtitle}>
              {codeSent
                ? `Enter the 6-digit code sent to ${selectedCountryPhoneCode}${phoneNumber}`
                : "Let's get started! Enter your phone number to create your MedSales account."}
            </Text>
          </View>

          {!codeSent ? (
            <>
              {/* Phone Number Input */}
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <RNTouchableOpacity
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPickerModal(true)}
                >
                  <Text style={styles.countrySelectorText}>
                    {selectedCountry?.cca2 || '🇵🇰'} {selectedCountryPhoneCode}
                  </Text>
                </RNTouchableOpacity>

                <TextInput
                  mode="outlined"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={styles.phoneInput}
                />
              </View>

              {/* Terms Checkbox */}
              <RNTouchableOpacity
                onPress={() => setIsAgreed(!isAgreed)}
                style={styles.termsContainer}
              >
                <View
                  style={[
                    styles.checkbox,
                    isAgreed && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  {isAgreed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to MedSales{' '}
                  <Text style={{ color: theme.colors.primary }}>Terms & Conditions</Text>
                </Text>
              </RNTouchableOpacity>
            </>
          ) : (
            <>
              {/* Verification Code Input */}
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                mode="outlined"
                placeholder="000000"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="numeric"
                maxLength={6}
                style={styles.codeInput}
              />

              {/* Resend Code */}
              <View style={styles.resendContainer}>
                <Text>Didn't receive the code? </Text>
                <RNTouchableOpacity
                  onPress={handleResendCode}
                  disabled={!canResend || loading}
                >
                  <Text
                    style={[
                      styles.resendText,
                      (!canResend || loading) && styles.resendTextDisabled,
                    ]}
                  >
                    {canResend && !loading ? 'Resend' : `Resend in ${countdown}s`}
                  </Text>
                </RNTouchableOpacity>
              </View>
            </>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Button */}
          <Button
            mode="contained"
            onPress={codeSent ? handleVerifyCode : handleSendCode}
            disabled={!isButtonEnabled || loading}
            loading={loading}
            style={styles.actionButton}
          >
            {codeSent ? 'Verify Code' : 'Send Verification Code'}
          </Button>
        </View>

        {/* Country Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCountryPickerModal}
          onRequestClose={() => setShowCountryPickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Title>Select Country</Title>
                <RNTouchableOpacity
                  onPress={() => {
                    setShowCountryPickerModal(false);
                    setSearchedCountry('');
                  }}
                >
                  <Text style={styles.closeButton}>×</Text>
                </RNTouchableOpacity>
              </View>

              <TextInput
                mode="outlined"
                placeholder="Search countries..."
                value={searchCountry}
                onChangeText={setSearchedCountry}
                style={styles.searchInput}
              />

              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.cca2}
                renderItem={renderCountryItem}
                style={styles.countriesList}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  countrySelector: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 16,
    marginRight: 8,
    justifyContent: 'center',
  },
  countrySelectorText: {
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  codeInput: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resendText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#999',
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f00',
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 32,
    color: '#666',
  },
  searchInput: {
    margin: 16,
  },
  countriesList: {
    paddingHorizontal: 16,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
  },
  countryCode: {
    fontSize: 14,
    color: '#666',
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  termsModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
  },
  termsModalContent: {
    padding: 24,
    alignItems: 'center',
  },
  termsIconContainer: {
    marginBottom: 16,
  },
  termsIcon: {
    fontSize: 48,
  },
  termsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  termsModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  termsButtonContainer: {
    width: '100%',
  },
  termsOkButton: {
    borderRadius: 8,
  },
});
