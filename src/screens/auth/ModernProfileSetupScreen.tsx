import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Text,
  Avatar,
  ActivityIndicator,
  ProgressBar,
  Surface,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { setManager } from '../../redux/slices/authSlice';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { createOrUpdateManager, getManagerByPhone } from '../../services/phoneAuthService';

const ModernProfileSetupScreen = ({ navigation, route }: any) => {
  const dispatch = useDispatch();
  const { phoneNumber } = route.params;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate profile completion percentage
  const getCompletionPercentage = () => {
    let completed = 0;
    if (name.trim()) completed += 40;
    if (email.trim()) completed += 30;
    if (avatarUri) completed += 30;
    return completed / 100;
  };

  // Request permissions
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera and gallery permissions to set your profile photo.'
        );
        return false;
      }
    }
    return true;
  };

  // Pick image from gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Show image picker options
  const showImagePickerOptions = () => {
    Alert.alert('Choose Profile Photo', 'Select how you want to add your photo', [
      {
        text: 'Take Photo',
        onPress: takePhoto,
      },
      {
        text: 'Choose from Gallery',
        onPress: pickImage,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  // Upload avatar to Firebase Storage
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarUri) return null;

    try {
      setUploading(true);

      // Create unique filename
      const filename = `avatars/${phoneNumber}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      // Convert URI to blob
      const response = await fetch(avatarUri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload photo. Continuing without photo.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Skip profile setup
  const handleSkip = async () => {
    try {
      setSaving(true);

      // Load profile and navigate to dashboard
      const managerData = await getManagerByPhone(phoneNumber);
      if (managerData) {
        dispatch(setManager(managerData as any));
      }
    } catch (error: any) {
      console.error('Error skipping setup:', error);
      Alert.alert('Error', 'Failed to continue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Continue with profile setup
  const handleContinue = async () => {
    // Validate email if provided
    if (email.trim() && !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address or leave it empty.');
      return;
    }

    try {
      setSaving(true);

      // Upload avatar if selected
      let photoURL: string | null = null;
      if (avatarUri) {
        photoURL = await uploadAvatar();
      }

      // Update profile in Firestore
      const updateData: any = {};
      if (name.trim()) updateData.name = name.trim();
      if (email.trim()) updateData.email = email.trim();
      if (photoURL) updateData.photoURL = photoURL;

      if (Object.keys(updateData).length > 0) {
        await createOrUpdateManager(phoneNumber, updateData);
      }

      // Load updated profile
      const managerData = await getManagerByPhone(phoneNumber);
      if (managerData) {
        dispatch(setManager(managerData as any));
      }

      // Show success message
      Alert.alert('Profile Updated!', 'Your profile has been set up successfully.');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#2196F3', '#1976D2', '#0D47A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <MaterialCommunityIcons name="account-circle" size={60} color="#FFF" />
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            Let's personalize your experience
          </Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Profile Completion</Text>
            <Text style={styles.progressPercent}>{Math.round(getCompletionPercentage() * 100)}%</Text>
          </View>
          <ProgressBar progress={getCompletionPercentage()} color="#FFF" style={styles.progressBar} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Avatar Card */}
          <Surface style={styles.avatarCard} elevation={2}>
            <Text style={styles.cardTitle}>Profile Photo</Text>
            <TouchableOpacity
              onPress={showImagePickerOptions}
              disabled={uploading}
              style={styles.avatarContainer}
            >
              {uploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="large" color="#2196F3" />
                </View>
              ) : avatarUri ? (
                <Avatar.Image size={120} source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={48} color="#2196F3" />
                </View>
              )}
              <View style={styles.cameraButton}>
                <MaterialCommunityIcons name="camera" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>
              {avatarUri ? 'Tap to change photo' : 'Tap to add a photo'}
            </Text>
          </Surface>

          {/* Personal Info Card */}
          <Surface style={styles.infoCard} elevation={2}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="account-details" size={24} color="#2196F3" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>

            {/* Name Input */}
            <View style={styles.inputSection}>
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                placeholder="Enter your full name"
                style={styles.textInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
                left={<TextInput.Icon icon="account" />}
              />
              <Text style={styles.inputHint}>Optional - You can add this later</Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputSection}>
              <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
                left={<TextInput.Icon icon="email" />}
              />
              <Text style={styles.inputHint}>Optional - For notifications and updates</Text>
            </View>

            {/* Phone Display */}
            <View style={styles.phoneRow}>
              <MaterialCommunityIcons name="phone" size={20} color="#2196F3" />
              <View style={styles.phoneInfo}>
                <Text style={styles.phoneLabel}>Phone Number</Text>
                <Text style={styles.phoneNumber}>{phoneNumber}</Text>
              </View>
              <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            </View>
          </Surface>

          {/* Info Message */}
          <View style={styles.infoMessage}>
            <MaterialCommunityIcons name="information" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              You can always update your profile later from the Profile tab
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleContinue}
              disabled={saving || uploading}
              style={styles.continueButtonWrapper}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButton}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              disabled={saving || uploading}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  progressSection: {
    paddingHorizontal: 20,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  avatarCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#E3F2FD',
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  infoCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#FFF',
    marginBottom: 6,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 4,
  },
  phoneInfo: {
    flex: 1,
    marginLeft: 12,
  },
  phoneLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default ModernProfileSetupScreen;
