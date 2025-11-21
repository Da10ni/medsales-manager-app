import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  Avatar,
  Chip,
  FAB,
  TextInput,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { collection, getDocs, query, where, orderBy, onSnapshot, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SalesRep } from '../types';

const SalesRepsScreen = ({ navigation }: any) => {
  const { user: manager } = useSelector((state: RootState) => state.auth);

  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Sales Rep Form
  const [countryCode, setCountryCode] = useState('+92');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch all sales reps (managers can see and assign to all sales reps)
  const fetchSalesReps = async () => {
    try {
      const q = query(
        collection(db, 'salesReps'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalesRep[];
      setSalesReps(data);
    } catch (error: any) {
      console.error('Error fetching sales reps:', error);
      Alert.alert('Error', 'Failed to load sales representatives');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSalesReps();

    // Real-time listener for all sales reps
    const q = query(
      collection(db, 'salesReps'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalesRep[];
      setSalesReps(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSalesReps();
  };

  // Reset form
  const resetForm = () => {
    setPhoneNumber('');
    setName('');
    setEmail('');
    setCountryCode('+92');
  };

  // Create new sales rep
  const handleCreateSalesRep = async () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number (at least 7 digits)');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter the sales rep name');
      return;
    }

    try {
      setCreating(true);
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;

      // Create sales rep in Firestore
      await setDoc(doc(db, 'salesReps', fullPhoneNumber), {
        phone: fullPhoneNumber,
        name: name.trim(),
        email: email.trim(),
        role: 'sales-rep',
        photoURL: '',
        isActive: true,
        status: 'available',
        managerId: manager?.phone || '',
        stats: {
          completedRoutes: 0,
          totalVisits: 0,
          totalDistance: 0,
          rating: 5.0,
        },
        createdBy: manager?.phone || '',
        createdAt: Timestamp.now(),
      });

      Alert.alert('Success! <�', `Sales Rep "${name}" has been created successfully!`);
      setShowAddModal(false);
      resetForm();
      fetchSalesReps();
    } catch (error: any) {
      console.error('Error creating sales rep:', error);
      Alert.alert('Error', error.message || 'Failed to create sales rep');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-route':
        return '#4CAF50';
      case 'available':
        return '#2196F3';
      case 'on-break':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-route':
        return 'On Route';
      case 'available':
        return 'Available';
      case 'on-break':
        return 'On Break';
      default:
        return 'Offline';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading sales reps...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Gradient Header */}
      <LinearGradient
        colors={['#2196F3', '#1976D2', '#0D47A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Sales Representatives</Text>
              <Text style={styles.headerSubtitle}>Manage your team</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{salesReps.length}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {salesReps.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons name="account-group-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Sales Reps Found</Text>
            <Text style={styles.emptySubtitle}>Add your first sales representative to get started</Text>
          </Surface>
        ) : (
          salesReps.map((rep) => (
            <TouchableOpacity
              key={rep.id}
              activeOpacity={0.7}
              onPress={() => {
                // TODO: Navigate to rep details
                console.log('View details for:', rep.name);
              }}
            >
              <Surface style={styles.repCard} elevation={2}>
                <View style={styles.repHeader}>
                  {rep.photoURL ? (
                    <Avatar.Image size={64} source={{ uri: rep.photoURL }} style={styles.avatar} />
                  ) : (
                    <Avatar.Text
                      size={64}
                      label={rep.name ? rep.name.substring(0, 2).toUpperCase() : 'SR'}
                      style={[styles.avatar, { backgroundColor: getStatusColor(rep.status) }]}
                      labelStyle={styles.avatarLabel}
                    />
                  )}
                  <View style={styles.repInfo}>
                    <Text style={styles.repName}>{rep.name}</Text>
                    <View style={styles.repContactRow}>
                      <MaterialCommunityIcons name="phone" size={14} color="#666" />
                      <Text style={styles.repContact}>{rep.phone}</Text>
                    </View>
                    {rep.email && (
                      <View style={styles.repContactRow}>
                        <MaterialCommunityIcons name="email" size={14} color="#666" />
                        <Text style={styles.repContact}>{rep.email}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{rep.stats?.completedRoutes || 0}</Text>
                    <Text style={styles.statLabel}>Routes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{rep.stats?.totalVisits || 0}</Text>
                    <Text style={styles.statLabel}>Visits</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{rep.stats?.totalDistance?.toFixed(0) || 0} km</Text>
                    <Text style={styles.statLabel}>Distance</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{rep.stats?.rating?.toFixed(1) || '5.0'}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                </View>

                {/* Status & Actions */}
                <View style={styles.repFooter}>
                  <Chip
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: getStatusColor(rep.status) + '20' }]}
                    textStyle={{ color: getStatusColor(rep.status), fontSize: 12 }}
                  >
                    {getStatusLabel(rep.status)}
                  </Chip>
                  <Button
                    mode="contained"
                    onPress={() => navigation.navigate('AssignRoute', { salesRepId: rep.id })}
                    style={styles.assignButton}
                    buttonColor="#2196F3"
                    compact
                  >
                    Assign Route
                  </Button>
                </View>

                {rep.isActive === false && (
                  <View style={styles.inactiveBadge}>
                    <MaterialCommunityIcons name="account-off" size={16} color="#999" />
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
                )}
              </Surface>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB - Add Sales Rep */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        label="Add Rep"
        color="#FFF"
      />

      {/* Add Sales Rep Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={['#2196F3', '#1976D2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <MaterialCommunityIcons name="account-plus" size={32} color="#FFF" />
              <Text style={styles.modalTitle}>Add Sales Representative</Text>
              <Text style={styles.modalSubtitle}>Create a new team member</Text>
            </LinearGradient>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                mode="outlined"
                placeholder="Enter full name"
                value={name}
                onChangeText={setName}
                style={styles.textInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <View style={styles.phoneRow}>
                <TextInput
                  mode="outlined"
                  value={countryCode}
                  onChangeText={setCountryCode}
                  style={styles.countryCodeInput}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#2196F3"
                />
                <TextInput
                  mode="outlined"
                  placeholder="3001234567"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#2196F3"
                />
              </View>

              {/* Email */}
              <Text style={styles.inputLabel}>Email (Optional)</Text>
              <TextInput
                mode="outlined"
                placeholder="email@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
              />

              <View style={{ height: 20 }} />

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  mode="contained"
                  onPress={handleCreateSalesRep}
                  loading={creating}
                  disabled={creating}
                  style={styles.createButton}
                  buttonColor="#2196F3"
                >
                  {creating ? 'Creating...' : 'Create Sales Rep'}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={creating}
                  style={styles.cancelButton}
                  textColor="#666"
                >
                  Cancel
                </Button>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  repCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  repHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#2196F3',
  },
  avatarLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  repInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  repName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  repContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  repContact: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  repFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    height: 28,
  },
  assignButton: {
    borderRadius: 8,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  inactiveText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  modalForm: {
    flex: 1,
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  countryCodeInput: {
    backgroundColor: '#FFF',
    width: 80,
  },
  phoneInput: {
    backgroundColor: '#FFF',
    flex: 1,
  },
  modalButtons: {
    gap: 12,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 4,
    borderColor: '#E0E0E0',
  },
});

export default SalesRepsScreen;
