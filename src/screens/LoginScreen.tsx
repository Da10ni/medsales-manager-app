// app/screens/PhoneSignUpScreen.tsx
import { functions } from "@/app/utils/configs/firebaseConfig";
import { NavigationProp, StackActions } from "@react-navigation/native";
import * as Location from "expo-location";
import { useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { httpsCallable } from "firebase/functions";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Flag from "react-native-flags";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import countries from "world-countries";
import { setValueInUserState } from "../redux/reducers/user.slice";
import {
  getDataFromFirestore,
  resendVerificationCode,
  verifyPhoneNumber,
} from "../services/firebaseServices";
import { fetchUserLocation } from "../services/locationServices";
import { RootStackParamList } from "../types/navigation";
import { showToast } from "../utils/toast";

interface PhoneSignUpScreenProps {
  onContinue: (phoneNumber: string) => void;
  onBack: () => void;
  onVerificationSuccess?: (userData: any) => void;
}

export default function PhoneSignUpScreen({
  onContinue,
  onBack,
  onVerificationSuccess,
}: PhoneSignUpScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [allChecked, setAllChecked] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
  const [selectedCountryPhoneCode, setSelectedCountryPhoneCode] = useState<
    string | null
  >("");
  const [showCountryPickerModal, setShowCountryPickerModal] =
    useState<boolean>(false);
  const [searchCountry, setSearchedCountry] = useState<string>("");

  // Firebase Functions state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const dispatch = useDispatch();

  // Initialize Firebase Functions
  const sendVerificationCode = httpsCallable(functions, "sendVerificationCode");
  const filteredCountries = countries
    .filter(
      (country) =>
        country.name.common
          .toLowerCase()
          .includes(searchCountry.toLowerCase()) ||
        country.cca2.toLowerCase().includes(searchCountry.toLowerCase())
    )
    .sort((a, b) => a.name.common.localeCompare(b.name.common));

  function getFormattedPhoneCode(countryCode: any) {
    const country = countries.find(
      (c) => c.cca2?.toLowerCase() === countryCode?.toLowerCase()
    );
    if (!country || !country.idd.root) return null;

    const root = country.idd.root;
    const suffix = country.idd.suffixes?.[0] || "";
    const phoneCode = root + suffix;
    return phoneCode;
  }

  useMemo(() => {
    const initialCountry: any = countries.find((country) =>
      country.altSpellings.includes("US")
    );
    setSelectedCountry(initialCountry);
    setSelectedCountryCode(initialCountry?.cca2);
    setSelectedCountryPhoneCode(getFormattedPhoneCode(initialCountry?.cca2));
  }, []);

  useEffect(() => {
    if (!codeSent) {
      // Enable button based on phone number validation only
      if (phoneNumber.length >= 10 && phoneNumber.length < 15) {
        setAllChecked(true);
      } else {
        setAllChecked(false);
      }
    } else {
      // For verification code, check if it's 6 digits
      setAllChecked(verificationCode.length === 6);
    }
  }, [phoneNumber, codeSent, verificationCode]);

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

  const renderCountryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => {
        setSelectedCountry(item);
        setSelectedCountryCode(item?.cca2);
        setShowCountryPickerModal(false);
        setSearchedCountry("");
        const formattedPhoneCode = getFormattedPhoneCode(item?.cca2);
        setSelectedCountryPhoneCode(formattedPhoneCode);
      }}
    >
      <Flag code={item.cca2} size={24} />
      <Text style={styles.countryName}>{item.name.common}</Text>
      <Text style={styles.countryCode}>{getFormattedPhoneCode(item.cca2)}</Text>
    </TouchableOpacity>
  );

  // Internal function to actually send the code
  const sendCodeInternal = async () => {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, "");

      // Format with country code
      const fullPhoneNumber = `${selectedCountryPhoneCode}${cleanPhoneNumber}`;

      console.log("Sending code to:", fullPhoneNumber);
      console.log("Phone number length:", fullPhoneNumber.length);

      const result: any = await sendVerificationCode({
        phoneNumber: fullPhoneNumber,
      });
      setCodeSent(true);

      if (result.data.success) {
        setCodeSent(true);
        startResendCountdown();
        showToast(
          "success",
          "Code Sent",
          "Please check your SMS for the verification code."
        );
      } else {
        setCodeSent(true);
      }
    } catch (err: any) {
      setCodeSent(true);
      console.error("Send code error:", err);
      console.error("Full error:", err);
      setError(err.message || "Failed to send verification code");
      showToast(
        "error",
        "Error",
        err.message || "Failed to send verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  // Main handler for send code button
  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }

    // Check if terms are agreed
    if (!isAgreed) {
      setShowTermsPopup(true);
      return;
    }

    // If terms are already agreed, send code directly
    await sendCodeInternal();
  };

  const handleTermsPopupOk = async () => {
    setIsAgreed(true);
    setShowTermsPopup(false);
    // Automatically trigger send code after accepting terms
    setTimeout(async () => {
      await sendCodeInternal();
    }, 100);
  };

  // Handle Verify code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showToast("error", "Error", "Please enter the 6-digit verification code");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Use the same phone formatting as sendCode
      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, "");
      const fullPhoneNumber = `${selectedCountryPhoneCode}${cleanPhoneNumber}`;
      const result: any = await verifyPhoneNumber({
        phoneNumber: fullPhoneNumber,
        code: verificationCode,
        role: "user",
      });
      showToast(
        "success",
        "Verification",
        "Phone number verified successfully!"
      );
      
      if (result?.isCreated) {
        navigation.dispatch(
          StackActions.replace("ProfileUpdate", {
            phoneNumber: result?.user?.uid,
          })
        );
      } else {
        const userPhoneNumber = result?.user?.uid;
        try {
          const userDataInDataBase = await getDataFromFirestore(
            "user",
            userPhoneNumber
          );
          if (userDataInDataBase) {
            dispatch(
              setValueInUserState({
                name: "info",
                data: userDataInDataBase,
              } as any)
            );
          }
        } catch (error) {
          console.log("error while fetching user data on user sign up", error);
        }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          await fetchUserLocation();
          navigation.dispatch(StackActions.replace("dashboardScreen"));
        } else {
          navigation.dispatch(StackActions.replace("LandingPage"));
        }
      }
    } catch (err: any) {
      console.error("Verify code error:", err);
      setError(err.message || "Failed to verify code");
      showToast("error", "Error", err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  // Resend Code Handler
  const handleResendCode = async () => {
    if (!canResend) {
      showToast("error", "Error", "Please wait before requesting another code");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the same phone formatting as sendCode
      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, "");
      const fullPhoneNumber = `${selectedCountryPhoneCode}${cleanPhoneNumber}`;

      const result: any = await resendVerificationCode({
        phoneNumber: fullPhoneNumber,
      });

      if (result?.success) {
        startResendCountdown();
        showToast(
          "success",
          "Code Resent",
          "Verification code resent successfully!"
        );
      } else {
        throw new Error(result.data.message || "Failed to resend code");
      }
    } catch (err: any) {
      console.error("Resend code error:", err);
      setError(err.message || "Failed to resend verification code");
      showToast(
        "error",
        "Error",
        err.message || "Failed to resend verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhoneInput = () => {
    setCodeSent(false);
    setError(null);
    setVerificationCode("");
    setCanResend(true);
    setCountdown(0);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <Modal
          animationType="fade"
          transparent={true}
          visible={showTermsPopup}
          onRequestClose={() => setShowTermsPopup(false)}
        >
          <View style={styles.termsModalOverlay}>
            <View style={styles.termsModalContainer}>
              <View style={styles.termsModalContent}>
                {/* Icon */}
                <View style={styles.termsIconContainer}>
                  <Text style={styles.termsIcon}>📋</Text>
                </View>

                {/* Title */}
                <Text style={styles.termsModalTitle}>Terms & Conditions</Text>

                {/* Message */}
                <Text style={styles.termsModalMessage}>
                  Please accept our Terms & Conditions to continue with creating
                  your ProMed account.
                </Text>

                {/* Buttons */}
                <View style={styles.termsButtonContainer}>
                  <TouchableOpacity
                    style={styles.termsOkButton}
                    onPress={handleTermsPopupOk}
                  >
                    <Text style={styles.termsOkButtonText}>
                      Accept & Continue
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
        {/* Header with Back Button */}
        <View className="flex-row items-center p-6 pb-0">
          <TouchableOpacity
            onPress={codeSent ? handleBackToPhoneInput : onBack}
            className="mr-4"
          >
            <Text className="text-2xl">←</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View className="flex-1 px-6 pt-4">
          {/* Title Section */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              {codeSent ? "Verify Your Phone ✨" : "Join ProMed Today ✨"}
            </Text>
            <Text className="text-base text-gray-600 leading-6">
              {codeSent
                ? `Enter the 6-digit code sent to ${selectedCountryPhoneCode + phoneNumber}`
                : "Let's get started! Enter your phone number to create your ProMed account."}
            </Text>
          </View>

          {!codeSent ? (
            <>
              {/* Phone Number Input */}
              <View className="mb-6">
                <Text className="text-base font-medium text-gray-900 mb-3">
                  Phone Number
                </Text>

                {/* Phone Input with Country Code */}
                <View className="flex-row border border-gray-200 rounded-xl overflow-hidden">
                  {/* Country Code Selector */}
                  <TouchableOpacity
                    className="flex-row items-center px-4 py-4 bg-gray-50 border-r border-gray-200"
                    onPress={() => setShowCountryPickerModal(true)}
                  >
                    {selectedCountry ? (
                      <>
                        <Flag code={selectedCountryCode} size={24} />
                        <Text className="text-base font-medium text-gray-700 ml-1">
                          {selectedCountryPhoneCode}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-lg mr-2">🇺🇸</Text>
                        <Text className="text-base font-medium text-gray-700 mr-1">
                          +1
                        </Text>
                        <Text className="text-gray-400">▼</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Phone Number Input */}
                  <TextInput
                    className="flex-1 px-4 py-4 text-base text-gray-900"
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={15}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                  />
                </View>
              </View>

              {/* Terms & Conditions Checkbox */}
              <TouchableOpacity
                onPress={() => setIsAgreed(!isAgreed)}
                className="flex-row items-start mb-8"
              >
                <View
                  className={`w-5 h-5 mr-3 mt-0.5 border-2 rounded ${isAgreed ? "bg-blue-500 border-blue-500" : "border-gray-300"} items-center justify-center`}
                >
                  {isAgreed && (
                    <Text className="text-white text-xs font-bold">✓</Text>
                  )}
                </View>
                <Text className="text-sm text-gray-700 flex-1 leading-5">
                  I agree to ProMed{" "}
                  <Text className="text-emerald-600 font-medium">
                    Terms & Conditions
                  </Text>
                  .
                </Text>
              </TouchableOpacity>

              {/* Already have account */}
              <View className="flex-row justify-center mb-8">
                <Text className="text-gray-600">Already have an account? </Text>
                <TouchableOpacity>
                  <Text className="text-emerald-600 font-medium">Sign in</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Verification Code Input */}
              <View className="mb-6">
                <Text className="text-base font-medium text-gray-900 mb-3">
                  Verification Code
                </Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900 text-center tracking-widest"
                  placeholder="000000"
                  placeholderTextColor="#9CA3AF"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="numeric"
                  maxLength={6}
                  style={{ letterSpacing: 4 }}
                />
              </View>

              {/* Resend Code */}
              <View className="flex-row justify-center mb-8">
                <Text className="text-gray-600">Didn't receive the code? </Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={!canResend || loading}
                >
                  <Text
                    className={`font-medium ${canResend && !loading ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {canResend && !loading
                      ? "Resend"
                      : `Resend in ${countdown}s`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Error Message */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <Text className="text-red-600 text-center">{error}</Text>
            </View>
          )}

          {/* Spacer */}
          <View className="flex-1" />

          {/* Action Button */}
           <View className="pb-6">
            <TouchableOpacity

              onPress={codeSent ? handleVerifyCode : handleSendCode}
              disabled={!allChecked || loading}
            >
              {
                loading
                  ?
                  <ActivityIndicator animating={true} color="white" />
                  : codeSent
                    ?
                    <Text>Verify Code</Text>
                    : <Text>Send Verification Code</Text>
              }

            </TouchableOpacity>
          </View>
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
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    setShowCountryPickerModal(false);
                    setSearchedCountry("");
                  }}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries..."
                value={searchCountry}
                onChangeText={setSearchedCountry}
              />

              {/* Countries List */}
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.cca2}
                renderItem={renderCountryItem}
                style={styles.countriesList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  selector: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  selectedCountryContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedCountryText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#666",
  },
  selectedDetails: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailText: {
    marginLeft: 15,
    flex: 1,
  },
  countryFullName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  detailItem: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    margin: 20,
    maxHeight: "80%",
    width: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#666",
    fontWeight: "bold",
  },
  searchInput: {
    margin: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  countriesList: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  countryName: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  countryCode: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  termsModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
    maxWidth: 320,
    overflow: "hidden",
  },
  termsModalContent: {
    padding: 24,
    alignItems: "center",
  },
  termsIconContainer: {
    marginBottom: 16,
  },
  termsIcon: {
    fontSize: 48,
  },
  termsModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  termsModalMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  termsButtonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  termsCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "transparent",
    alignItems: "center",
  },
  termsCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  termsOkButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6", // 🔵 blue-500 instead of green
    alignItems: "center",
  },
  termsOkButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
