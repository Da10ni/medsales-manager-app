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
  Chip,
  FAB,
  TextInput,
  Button,
  ActivityIndicator,
  Portal,
  Menu,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface Route {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  managerId: string;
  salesRepId: string;
  salesRepName: string;
  distributors: Distributor[];
  createdAt: any;
}

interface Distributor {
  id: string;
  name: string;
  address: string;
  type: 'hospital' | 'pharmacy' | 'clinic' | 'distributor';
  routeType: 'follow-up' | 'visit' | 'stock-check' | 'promote';
  contact?: string;
  phone?: string;
  order: number;
}

interface SalesRep {
  id: string;
  name: string;
  phone: string;
  managerId: string;
}

const RoutesScreen = ({ navigation }: any) => {
  const { user: manager } = useSelector((state: RootState) => state.auth);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddDistributorModal, setShowAddDistributorModal] = useState(false);

  // Create Route Form
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState('');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [creating, setCreating] = useState(false);

  // Sales Rep Selection Menu
  const [showSalesRepMenu, setShowSalesRepMenu] = useState(false);

  // Add Distributor Form
  const [distName, setDistName] = useState('');
  const [distAddress, setDistAddress] = useState('');
  const [distType, setDistType] = useState<'hospital' | 'pharmacy' | 'clinic' | 'distributor'>('hospital');
  const [distRouteType, setDistRouteType] = useState<'follow-up' | 'visit' | 'stock-check' | 'promote'>('visit');
  const [distContact, setDistContact] = useState('');
  const [distPhone, setDistPhone] = useState('');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showRouteTypeMenu, setShowRouteTypeMenu] = useState(false);

  const distributorTypes = [
    { value: 'hospital', label: 'Hospital', icon: 'hospital-building', color: '#F44336' },
    { value: 'pharmacy', label: 'Pharmacy', icon: 'pharmacy', color: '#4CAF50' },
    { value: 'clinic', label: 'Clinic', icon: 'medical-bag', color: '#2196F3' },
    { value: 'distributor', label: 'Distributor', icon: 'truck-delivery', color: '#FF9800' },
  ];

  const routeTypes = [
    { value: 'follow-up', label: 'Follow Up', icon: 'phone-check', color: '#2196F3' },
    { value: 'visit', label: 'Visit', icon: 'map-marker-check', color: '#4CAF50' },
    { value: 'stock-check', label: 'Stock Check', icon: 'package-variant', color: '#FF9800' },
    { value: 'promote', label: 'Promote', icon: 'bullhorn', color: '#9C27B0' },
  ];

  const getTypeInfo = (type: string) => {
    return distributorTypes.find((t) => t.value === type) || distributorTypes[0];
  };

  const getRouteTypeInfo = (type: string) => {
    return routeTypes.find((t) => t.value === type) || routeTypes[1];
  };

  // Fetch routes
  const fetchRoutes = async () => {
    try {
      if (!manager?.phone) return;

      const q = query(
        collection(db, 'routes'),
        where('managerId', '==', manager.phone),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Route[];
      setRoutes(data);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch sales reps
  const fetchSalesReps = async () => {
    try {
      if (!manager?.phone) return;

      const q = query(
        collection(db, 'salesReps'),
        where('managerId', '==', manager.phone)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalesRep[];
      setSalesReps(data);
    } catch (error: any) {
      console.error('Error fetching sales reps:', error);
    }
  };

  useEffect(() => {
    if (!manager?.phone) return;

    fetchRoutes();
    fetchSalesReps();

    // Real-time listener for routes
    const q = query(
      collection(db, 'routes'),
      where('managerId', '==', manager.phone),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Route[];
      setRoutes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [manager?.phone]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
    fetchSalesReps();
  };

  // Reset form
  const resetForm = () => {
    setRouteName('');
    setRouteDescription('');
    setSelectedSalesRepId('');
    setDistributors([]);
  };

  // Reset distributor form
  const resetDistributorForm = () => {
    setDistName('');
    setDistAddress('');
    setDistType('hospital');
    setDistRouteType('visit');
    setDistContact('');
    setDistPhone('');
  };

  // Add distributor to route
  const handleAddDistributor = () => {
    if (!distName.trim() || !distAddress.trim()) {
      Alert.alert('Missing Info', 'Please enter distributor name and address');
      return;
    }

    const newDistributor: Distributor = {
      id: Date.now().toString(),
      name: distName.trim(),
      address: distAddress.trim(),
      type: distType,
      routeType: distRouteType,
      contact: distContact.trim(),
      phone: distPhone.trim(),
      order: distributors.length + 1,
    };

    setDistributors([...distributors, newDistributor]);
    setShowAddDistributorModal(false);
    resetDistributorForm();
  };

  // Remove distributor
  const handleRemoveDistributor = (id: string) => {
    const updated = distributors.filter((d) => d.id !== id);
    // Reorder
    const reordered = updated.map((d, index) => ({
      ...d,
      order: index + 1,
    }));
    setDistributors(reordered);
  };

  // Create route
  const handleCreateRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert('Route Name Required', 'Please enter a route name');
      return;
    }

    if (!selectedSalesRepId) {
      Alert.alert('Sales Rep Required', 'Please select a sales representative');
      return;
    }

    if (distributors.length === 0) {
      Alert.alert('Stops Required', 'Please add at least one stop/distributor');
      return;
    }

    try {
      setCreating(true);
      const selectedRep = salesReps.find((r) => r.id === selectedSalesRepId);
      const routeId = `route_${Date.now()}`;

      await setDoc(doc(db, 'routes', routeId), {
        name: routeName.trim(),
        description: routeDescription.trim(),
        status: 'active',
        managerId: manager?.phone || '',
        salesRepId: selectedSalesRepId,
        salesRepName: selectedRep?.name || '',
        distributors: distributors,
        createdAt: Timestamp.now(),
      });

      Alert.alert('Success! <‰', `Route "${routeName}" has been created and assigned!`);
      setShowAddModal(false);
      resetForm();
      fetchRoutes();
    } catch (error: any) {
      console.error('Error creating route:', error);
      Alert.alert('Error', error.message || 'Failed to create route');
    } finally {
      setCreating(false);
    }
  };

  // Delete route
  const handleDeleteRoute = (routeId: string, routeName: string) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete "${routeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'routes', routeId));
              Alert.alert('Deleted', 'Route has been deleted');
              fetchRoutes();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete route');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading routes...</Text>
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
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Routes</Text>
              <Text style={styles.headerSubtitle}>Manage and assign routes</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{routes.length}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {routes.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons name="map-marker-off" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Routes Found</Text>
            <Text style={styles.emptySubtitle}>Create your first route to get started</Text>
          </Surface>
        ) : (
          routes.map((route) => (
            <Surface key={route.id} style={styles.routeCard} elevation={2}>
              <View style={styles.routeHeader}>
                <View style={styles.routeHeaderLeft}>
                  <MaterialCommunityIcons name="map-marker-path" size={24} color="#2196F3" />
                  <View style={styles.routeTitleSection}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    {route.description && (
                      <Text style={styles.routeDescription}>{route.description}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteRoute(route.id, route.name)}
                  style={styles.deleteButton}
                >
                  <MaterialCommunityIcons name="delete" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account" size={16} color="#666" />
                  <Text style={styles.infoText}>{route.salesRepName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
                  <Text style={styles.infoText}>{route.distributors.length} stops</Text>
                </View>
              </View>

              {/* Distributors/Stops */}
              <View style={styles.distributorsSection}>
                <Text style={styles.stopsTitle}>Stops ({route.distributors.length})</Text>
                {route.distributors.slice(0, 3).map((dist, index) => (
                  <View key={dist.id} style={styles.stopItem}>
                    <View style={styles.stopOrder}>
                      <Text style={styles.stopOrderText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopName}>{dist.name}</Text>
                      <View style={styles.stopTags}>
                        <Chip
                          mode="flat"
                          style={[
                            styles.stopTypeChip,
                            { backgroundColor: getTypeInfo(dist.type).color + '20' },
                          ]}
                          textStyle={{
                            color: getTypeInfo(dist.type).color,
                            fontSize: 10,
                          }}
                        >
                          {getTypeInfo(dist.type).label}
                        </Chip>
                        <Chip
                          mode="flat"
                          style={[
                            styles.stopTypeChip,
                            { backgroundColor: getRouteTypeInfo(dist.routeType).color + '20' },
                          ]}
                          textStyle={{
                            color: getRouteTypeInfo(dist.routeType).color,
                            fontSize: 10,
                          }}
                        >
                          {getRouteTypeInfo(dist.routeType).label}
                        </Chip>
                      </View>
                    </View>
                  </View>
                ))}
                {route.distributors.length > 3 && (
                  <Text style={styles.moreStops}>
                    +{route.distributors.length - 3} more stops
                  </Text>
                )}
              </View>

              <View style={styles.routeFooter}>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(route.status) + '20' },
                  ]}
                  textStyle={{ color: getStatusColor(route.status), fontSize: 12 }}
                >
                  {route.status.toUpperCase()}
                </Chip>
              </View>
            </Surface>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB - Create Route */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        label="Create Route"
        color="#FFF"
      />

      {/* Create Route Modal */}
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
              <MaterialCommunityIcons name="map-marker-plus" size={32} color="#FFF" />
              <Text style={styles.modalTitle}>Create New Route</Text>
              <Text style={styles.modalSubtitle}>Add route with stops</Text>
            </LinearGradient>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Route Name */}
              <Text style={styles.inputLabel}>Route Name *</Text>
              <TextInput
                mode="outlined"
                placeholder="Enter route name"
                value={routeName}
                onChangeText={setRouteName}
                style={styles.textInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
              />

              {/* Route Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                mode="outlined"
                placeholder="Enter route description"
                value={routeDescription}
                onChangeText={setRouteDescription}
                style={styles.textInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#2196F3"
                multiline
                numberOfLines={2}
              />

              {/* Sales Rep Selection */}
              <Text style={styles.inputLabel}>Assign to Sales Rep *</Text>
              <Menu
                visible={showSalesRepMenu}
                onDismiss={() => setShowSalesRepMenu(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.salesRepSelector}
                    onPress={() => setShowSalesRepMenu(true)}
                  >
                    <MaterialCommunityIcons name="account" size={20} color="#666" />
                    <Text style={styles.salesRepSelectorText}>
                      {selectedSalesRepId
                        ? salesReps.find((r) => r.id === selectedSalesRepId)?.name
                        : 'Select Sales Rep'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                }
              >
                {salesReps.map((rep) => (
                  <Menu.Item
                    key={rep.id}
                    onPress={() => {
                      setSelectedSalesRepId(rep.id);
                      setShowSalesRepMenu(false);
                    }}
                    title={rep.name}
                    leadingIcon="account"
                  />
                ))}
              </Menu>

              {/* Distributors */}
              <View style={styles.distributorsHeader}>
                <Text style={styles.inputLabel}>Stops ({distributors.length})</Text>
                <Button
                  mode="contained"
                  onPress={() => setShowAddDistributorModal(true)}
                  style={styles.addDistButton}
                  buttonColor="#2196F3"
                  icon="plus"
                  compact
                >
                  Add Stop
                </Button>
              </View>

              {/* Distributors List */}
              {distributors.map((dist, index) => (
                <Surface key={dist.id} style={styles.distItem} elevation={1}>
                  <View style={styles.distItemHeader}>
                    <View style={styles.distItemLeft}>
                      <View style={styles.distOrder}>
                        <Text style={styles.distOrderText}>{index + 1}</Text>
                      </View>
                      <View>
                        <Text style={styles.distItemName}>{dist.name}</Text>
                        <Text style={styles.distItemAddress} numberOfLines={1}>
                          {dist.address}
                        </Text>
                        <View style={styles.distItemTags}>
                          <Chip
                            mode="flat"
                            style={[
                              styles.distItemChip,
                              { backgroundColor: getTypeInfo(dist.type).color + '20' },
                            ]}
                            textStyle={{ color: getTypeInfo(dist.type).color, fontSize: 10 }}
                          >
                            {getTypeInfo(dist.type).label}
                          </Chip>
                          <Chip
                            mode="flat"
                            style={[
                              styles.distItemChip,
                              { backgroundColor: getRouteTypeInfo(dist.routeType).color + '20' },
                            ]}
                            textStyle={{
                              color: getRouteTypeInfo(dist.routeType).color,
                              fontSize: 10,
                            }}
                          >
                            {getRouteTypeInfo(dist.routeType).label}
                          </Chip>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveDistributor(dist.id)}
                      style={styles.distItemDelete}
                    >
                      <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </Surface>
              ))}

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  mode="contained"
                  onPress={handleCreateRoute}
                  loading={creating}
                  disabled={creating}
                  style={styles.createButton}
                  buttonColor="#2196F3"
                >
                  {creating ? 'Creating...' : 'Create Route'}
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

      {/* Add Distributor Modal - Wrapped in Portal */}
      <Portal>
        <Modal
          visible={showAddDistributorModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowAddDistributorModal(false)}
        >
          <View style={styles.distModalOverlay}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Surface style={styles.distModalContent} elevation={4}>
                <Text style={styles.distModalTitle}>Add Stop</Text>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="e.g., City Hospital"
                    value={distName}
                    onChangeText={setDistName}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#2196F3"
                  />

                  <Text style={styles.inputLabel}>Type *</Text>
                  <Menu
                    visible={showTypeMenu}
                    onDismiss={() => setShowTypeMenu(false)}
                    anchor={
                      <TouchableOpacity
                        style={styles.typeSelector}
                        onPress={() => setShowTypeMenu(true)}
                      >
                        <MaterialCommunityIcons
                          name={getTypeInfo(distType).icon as any}
                          size={20}
                          color={getTypeInfo(distType).color}
                        />
                        <Text style={styles.typeSelectorText}>{getTypeInfo(distType).label}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                      </TouchableOpacity>
                    }
                  >
                    {distributorTypes.map((type) => (
                      <Menu.Item
                        key={type.value}
                        onPress={() => {
                          setDistType(type.value as any);
                          setShowTypeMenu(false);
                        }}
                        title={type.label}
                        leadingIcon={type.icon}
                      />
                    ))}
                  </Menu>

                  <Text style={styles.inputLabel}>Route Type *</Text>
                  <Menu
                    visible={showRouteTypeMenu}
                    onDismiss={() => setShowRouteTypeMenu(false)}
                    anchor={
                      <TouchableOpacity
                        style={styles.typeSelector}
                        onPress={() => setShowRouteTypeMenu(true)}
                      >
                        <MaterialCommunityIcons
                          name={getRouteTypeInfo(distRouteType).icon as any}
                          size={20}
                          color={getRouteTypeInfo(distRouteType).color}
                        />
                        <Text style={styles.typeSelectorText}>
                          {getRouteTypeInfo(distRouteType).label}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                      </TouchableOpacity>
                    }
                  >
                    {routeTypes.map((type) => (
                      <Menu.Item
                        key={type.value}
                        onPress={() => {
                          setDistRouteType(type.value as any);
                          setShowRouteTypeMenu(false);
                        }}
                        title={type.label}
                        leadingIcon={type.icon}
                      />
                    ))}
                  </Menu>

                  <Text style={styles.inputLabel}>Address *</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Full address"
                    value={distAddress}
                    onChangeText={setDistAddress}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#2196F3"
                    multiline
                    numberOfLines={2}
                  />

                  <Text style={styles.inputLabel}>Contact Person (Optional)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Contact name"
                    value={distContact}
                    onChangeText={setDistContact}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#2196F3"
                  />

                  <Text style={styles.inputLabel}>Contact Phone (Optional)</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Phone number"
                    value={distPhone}
                    onChangeText={setDistPhone}
                    keyboardType="phone-pad"
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#2196F3"
                  />

                  <View style={styles.distModalButtons}>
                    <Button
                      mode="contained"
                      onPress={handleAddDistributor}
                      style={styles.distAddBtn}
                      buttonColor="#2196F3"
                    >
                      Add Stop
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowAddDistributorModal(false);
                        resetDistributorForm();
                      }}
                      style={styles.distCancelBtn}
                      textColor="#666"
                    >
                      Cancel
                    </Button>
                  </View>
                </ScrollView>
              </Surface>
            </View>
          </View>
        </Modal>
      </Portal>
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
  routeCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  routeTitleSection: {
    marginLeft: 12,
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  distributorsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopOrder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopOrderText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stopTags: {
    flexDirection: 'row',
    gap: 6,
  },
  stopTypeChip: {
    height: 20,
  },
  moreStops: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  routeFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusChip: {
    height: 28,
    alignSelf: 'flex-start',
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
  salesRepSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  salesRepSelectorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  distributorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  addDistButton: {
    borderRadius: 8,
  },
  distItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  distItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distItemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  distOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  distOrderText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  distItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  distItemAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  distItemTags: {
    flexDirection: 'row',
    gap: 6,
  },
  distItemChip: {
    height: 22,
  },
  distItemDelete: {
    padding: 4,
  },
  modalButtons: {
    gap: 12,
    marginTop: 24,
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
  distModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    backgroundColor: '#FFF',
    padding: 20,
  },
  distModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  typeSelectorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  distModalButtons: {
    marginTop: 20,
    gap: 12,
  },
  distAddBtn: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  distCancelBtn: {
    borderRadius: 12,
    paddingVertical: 4,
    borderColor: '#E0E0E0',
  },
});

export default RoutesScreen;
