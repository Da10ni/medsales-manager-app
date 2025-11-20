import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Title,
  Button,
  Chip,
  TextInput,
  Card,
  Avatar,
  Divider,
  IconButton,
  Menu,
  useTheme,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { fetchSalesReps } from '../redux/slices/salesRepsSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { createRoute } from '../redux/slices/routesSlice';
import { RouteLocation, Location, SalesRep, TaskPriority } from '../types';

const AssignRouteScreen = ({ route, navigation }: any) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { salesReps } = useSelector((state: RootState) => state.salesReps);
  const { locations } = useSelector((state: RootState) => state.locations);

  const salesRepIdParam = route.params?.salesRepId;

  const [step, setStep] = useState(1);
  const [selectedSalesRep, setSelectedSalesRep] = useState<SalesRep | null>(null);
  const [routeName, setRouteName] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<RouteLocation[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      dispatch(fetchSalesReps(user.id));
      dispatch(fetchLocations(user.id));
    }
  }, [user]);

  useEffect(() => {
    if (salesRepIdParam) {
      const rep = salesReps.find(r => r.id === salesRepIdParam);
      if (rep) {
        setSelectedSalesRep(rep);
        setStep(2);
      }
    }
  }, [salesRepIdParam, salesReps]);

  const handleSelectSalesRep = (rep: SalesRep) => {
    setSelectedSalesRep(rep);
    setStep(2);
  };

  const handleAddLocation = (location: Location) => {
    const routeLocation: RouteLocation = {
      locationId: location.id,
      location,
      visitOrder: selectedLocations.length + 1,
      estimatedDuration: 30,
      tasks: [],
      products: [],
      priority: 'medium',
      status: 'pending',
      notes: '',
    };
    setSelectedLocations([...selectedLocations, routeLocation]);
  };

  const handleRemoveLocation = (locationId: string) => {
    const updated = selectedLocations.filter(loc => loc.locationId !== locationId);
    // Reorder
    const reordered = updated.map((loc, index) => ({
      ...loc,
      visitOrder: index + 1,
    }));
    setSelectedLocations(reordered);
  };

  const handleMoveLocation = (index: number, direction: 'up' | 'down') => {
    const newLocations = [...selectedLocations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newLocations.length) {
      [newLocations[index], newLocations[targetIndex]] = [
        newLocations[targetIndex],
        newLocations[index],
      ];
      // Update visit order
      newLocations.forEach((loc, idx) => {
        loc.visitOrder = idx + 1;
      });
      setSelectedLocations(newLocations);
    }
  };

  const handleUpdateLocationDetails = (
    locationId: string,
    field: keyof RouteLocation,
    value: any
  ) => {
    const updated = selectedLocations.map(loc =>
      loc.locationId === locationId ? { ...loc, [field]: value } : loc
    );
    setSelectedLocations(updated);
  };

  const handleAssignRoute = async () => {
    if (!selectedSalesRep || selectedLocations.length === 0 || !routeName) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        createRoute({
          routeName,
          assignedTo: selectedSalesRep.id,
          assignedBy: user!.id,
          date: new Date(),
          status: 'assigned',
          locations: selectedLocations,
          totalDistance: '0 km', // Calculate this based on actual coordinates
          estimatedTotalTime: `${selectedLocations.reduce((sum, loc) => sum + loc.estimatedDuration, 0)} mins`,
          createdAt: new Date(),
        })
      ).unwrap();

      Alert.alert('Success', 'Route assigned successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to assign route');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || loc.type === filterType;
    const notSelected = !selectedLocations.find(sl => sl.locationId === loc.id);
    return matchesSearch && matchesFilter && notSelected;
  });

  const renderStep1 = () => (
    <View>
      <Title style={styles.stepTitle}>Step 1: Select Sales Representative</Title>
      <ScrollView style={styles.scrollContent}>
        {salesReps
          .filter(rep => rep.isActive && rep.status !== 'on-route')
          .map(rep => (
            <Card
              key={rep.id}
              style={styles.repCard}
              onPress={() => handleSelectSalesRep(rep)}
            >
              <Card.Content style={styles.repCardContent}>
                <Avatar.Text
                  size={50}
                  label={rep.name.substring(0, 2).toUpperCase()}
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <View style={styles.repInfo}>
                  <Text style={styles.repName}>{rep.name}</Text>
                  <Text style={styles.repDetails}>{rep.email}</Text>
                  <Chip mode="flat" compact>
                    {rep.status}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          ))}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Step 2: Route Details</Title>

      <Card style={styles.selectedRepCard}>
        <Card.Content style={styles.repCardContent}>
          <Avatar.Text
            size={40}
            label={selectedSalesRep!.name.substring(0, 2).toUpperCase()}
          />
          <View style={styles.repInfo}>
            <Text style={styles.repName}>{selectedSalesRep!.name}</Text>
            <Text style={styles.repDetails}>Selected Representative</Text>
          </View>
          <IconButton icon="pencil" onPress={() => setStep(1)} />
        </Card.Content>
      </Card>

      <TextInput
        label="Route Name *"
        value={routeName}
        onChangeText={setRouteName}
        mode="outlined"
        placeholder="e.g., Shahrah-e-Faisal Route"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={() => setStep(3)}
        disabled={!routeName}
        style={styles.nextButton}
      >
        Next: Select Locations
      </Button>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Step 3: Select Locations</Title>

      {selectedLocations.length > 0 && (
        <Card style={styles.selectedLocationsCard}>
          <Card.Content>
            <Text style={styles.selectedCount}>
              {selectedLocations.length} locations selected
            </Text>
            {selectedLocations.map((routeLoc, index) => (
              <View key={routeLoc.locationId} style={styles.selectedLocationItem}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{routeLoc.visitOrder}</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{routeLoc.location?.name}</Text>
                  <Text style={styles.locationAddress}>
                    {routeLoc.location?.address}
                  </Text>
                </View>
                <View style={styles.locationActions}>
                  <IconButton
                    icon="arrow-up"
                    size={20}
                    disabled={index === 0}
                    onPress={() => handleMoveLocation(index, 'up')}
                  />
                  <IconButton
                    icon="arrow-down"
                    size={20}
                    disabled={index === selectedLocations.length - 1}
                    onPress={() => handleMoveLocation(index, 'down')}
                  />
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => handleRemoveLocation(routeLoc.locationId)}
                  />
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      <TextInput
        label="Search locations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        left={<TextInput.Icon icon="magnify" />}
        style={styles.searchInput}
      />

      <View style={styles.filterContainer}>
        {['all', 'hospital', 'lab', 'clinic', 'pharmacy'].map(type => (
          <Chip
            key={type}
            selected={filterType === type}
            onPress={() => setFilterType(type)}
            style={styles.filterChip}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Chip>
        ))}
      </View>

      <ScrollView style={styles.locationsScroll}>
        {filteredLocations.map(location => (
          <Card key={location.id} style={styles.locationCard}>
            <Card.Content>
              <View style={styles.locationCardContent}>
                <Avatar.Icon
                  size={40}
                  icon={
                    location.type === 'hospital'
                      ? 'hospital-building'
                      : location.type === 'lab'
                      ? 'flask'
                      : location.type === 'clinic'
                      ? 'medical-bag'
                      : 'pill'
                  }
                />
                <View style={styles.locationDetails}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                  <Chip compact mode="outlined">
                    {location.type}
                  </Chip>
                </View>
                <Button mode="contained" onPress={() => handleAddLocation(location)}>
                  Add
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.bottomActions}>
        <Button mode="outlined" onPress={() => setStep(2)} style={styles.backButton}>
          Back
        </Button>
        <Button
          mode="contained"
          onPress={() => setStep(4)}
          disabled={selectedLocations.length === 0}
          style={styles.nextButton}
        >
          Next: Review
        </Button>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.stepContainer}>
      <Title style={styles.stepTitle}>Step 4: Review & Assign</Title>

      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewLabel}>Route Name</Text>
          <Text style={styles.reviewValue}>{routeName}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.reviewLabel}>Assigned To</Text>
          <Text style={styles.reviewValue}>{selectedSalesRep?.name}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.reviewLabel}>Total Locations</Text>
          <Text style={styles.reviewValue}>{selectedLocations.length}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.reviewLabel}>Estimated Duration</Text>
          <Text style={styles.reviewValue}>
            {selectedLocations.reduce((sum, loc) => sum + loc.estimatedDuration, 0)} minutes
          </Text>

          <Divider style={styles.divider} />

          <Text style={styles.reviewLabel}>Locations in Order</Text>
          {selectedLocations.map((routeLoc, index) => (
            <View key={routeLoc.locationId} style={styles.reviewLocationItem}>
              <Text style={styles.reviewLocationOrder}>{index + 1}.</Text>
              <Text style={styles.reviewLocationName}>{routeLoc.location?.name}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <View style={styles.bottomActions}>
        <Button mode="outlined" onPress={() => setStep(3)} style={styles.backButton}>
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleAssignRoute}
          loading={loading}
          disabled={loading}
          style={styles.assignButton}
        >
          Assign Route
        </Button>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map(s => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step >= s && { backgroundColor: theme.colors.primary },
            ]}
          />
        ))}
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  stepContainer: {
    flex: 1,
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  scrollContent: {
    flex: 1,
  },
  repCard: {
    marginBottom: 12,
  },
  repCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repInfo: {
    flex: 1,
    marginLeft: 12,
  },
  repName: {
    fontSize: 16,
    fontWeight: '600',
  },
  repDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectedRepCard: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  nextButton: {
    marginTop: 8,
  },
  selectedLocationsCard: {
    marginBottom: 16,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationAddress: {
    fontSize: 11,
    color: '#666',
  },
  locationActions: {
    flexDirection: 'row',
  },
  searchInput: {
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    marginRight: 4,
  },
  locationsScroll: {
    flex: 1,
    marginBottom: 80,
  },
  locationCard: {
    marginBottom: 12,
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDetails: {
    flex: 1,
    marginLeft: 12,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  assignButton: {
    flex: 2,
  },
  reviewCard: {
    marginBottom: 80,
  },
  reviewLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  reviewLocationItem: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  reviewLocationOrder: {
    fontWeight: '600',
    marginRight: 8,
  },
  reviewLocationName: {
    flex: 1,
  },
});

export default AssignRouteScreen;
