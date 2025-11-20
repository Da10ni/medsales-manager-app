import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Avatar,
  useTheme,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { setManager } from '../../redux/slices/authSlice';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { createOrUpdateManager } from '../../services/phoneAuthService';

const ModernProfileScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user: manager } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(manager?.name || '');
  const [email, setEmail] = useState(manager?.email || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Request permissions
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraStatus === 'granted' && galleryStatus === 'granted';
  };

  // Pick image
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  // Upload image
  const uploadImage = async (uri: string) => {
    if (!manager) return;

    try {
      setUploading(true);
      const filename = `avatars/${manager.phone}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await createOrUpdateManager(manager.phone, { photoURL: downloadURL });
      dispatch(setManager({ ...manager, photoURL: downloadURL } as any));
      Alert.alert('Success!', 'Profile photo updated ✨');
    } catch (error: any) {
      Alert.alert('Oops!', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!manager) return;

    try {
      setSaving(true);

      await createOrUpdateManager(manager.phone, {
        name: name.trim(),
        email: email.trim(),
      });

      dispatch(setManager({ ...manager, name: name.trim(), email: email.trim() } as any));
      setEditMode(false);
      Alert.alert('Saved!', 'Profile updated successfully ✨');
    } catch (error: any) {
      Alert.alert('Oops!', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Logout
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(setManager(null));
          Alert.alert('Goodbye!', 'Logged out successfully 👋');
        },
      },
    ]);
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editButton}>
            <MaterialCommunityIcons
              name={editMode ? "close" : "pencil"}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.avatarContainer}>
            {uploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color="#FFF" />
              </View>
            ) : manager?.photoURL ? (
              <Avatar.Image size={120} source={{ uri: manager.photoURL }} style={styles.avatar} />
            ) : (
              <Avatar.Icon size={120} icon="account" style={styles.avatar} color="#FFF" />
            )}
            <View style={styles.cameraButton}>
              <MaterialCommunityIcons name="camera" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{manager?.name || manager?.phone || 'Manager'}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Surface style={styles.statCard} elevation={0}>
            <LinearGradient
              colors={['#2196F3', '#1E88E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="account-group" size={28} color="#FFF" />
              <Text style={styles.statValue}>{manager?.stats?.totalSalesReps || 0}</Text>
              <Text style={styles.statLabel}>Sales Reps</Text>
            </LinearGradient>
          </Surface>

          <Surface style={styles.statCard} elevation={0}>
            <LinearGradient
              colors={['#4CAF50', '#43A047']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="map-marker-path" size={28} color="#FFF" />
              <Text style={styles.statValue}>{manager?.stats?.activeRoutes || 0}</Text>
              <Text style={styles.statLabel}>Active Routes</Text>
            </LinearGradient>
          </Surface>

          <Surface style={styles.statCard} elevation={0}>
            <LinearGradient
              colors={['#FF9800', '#FB8C00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="check-circle" size={28} color="#FFF" />
              <Text style={styles.statValue}>{manager?.stats?.completedRoutes || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          </Surface>
        </View>

        {/* Profile Info Card */}
        <Surface style={styles.infoCard} elevation={2}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-details" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          {/* Phone */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={20} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{manager?.phone}</Text>
            </View>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          </View>

          {/* Name */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={20} color="#2196F3" />
            {editMode ? (
              <TextInput
                value={name}
                onChangeText={setName}
                mode="outlined"
                placeholder="Your name"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
              />
            ) : (
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{name || 'Not set'}</Text>
              </View>
            )}
          </View>

          {/* Email */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color="#2196F3" />
            {editMode ? (
              <TextInput
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                placeholder="your@email.com"
                keyboardType="email-address"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
              />
            ) : (
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{email || 'Not set'}</Text>
              </View>
            )}
          </View>

          {editMode && (
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
            >
              Save Changes
            </Button>
          )}
        </Surface>

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={20} color="#D32F2F" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarLoading: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
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
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  infoCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#FFF',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFEBEE',
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ModernProfileScreen;
