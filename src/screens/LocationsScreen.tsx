import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Text,
  FAB,
  Card,
  Chip,
  IconButton,
  Searchbar,
  Portal,
  Dialog,
  TextInput,
  Button,
  useTheme,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { fetchLocations, createLocation, removeLocation } from '../redux/slices/locationsSlice';
import { Location } from '../types';

const LocationsScreen = () => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { locations, loading } = useSelector((state: RootState) => state.locations);

  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    type: 'hospital' as 'hospital' | 'lab' | 'clinic' | 'pharmacy',
    address: '',
    area: '',
    phone: '',
    contactPerson: '',
  });

  useEffect(() => {
    if (user) {
      dispatch(fetchLocations(user.id));
    }
  }, [user]);

  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.area || !newLocation.address) {
      Alert.alert('Error', 'Please fill in name, area, and address');
      return;
    }

    try {
      await dispatch(createLocation({
        ...newLocation,
        coordinates: { latitude: 0, longitude: 0 }, // Default for now
        tags: [],
        createdBy: user!.id,
        createdAt: new Date(),
        totalVisits: 0,
      })).unwrap();

      setDialogVisible(false);
      setNewLocation({
        name: '',
        type: 'hospital',
        address: '',
        area: '',
        phone: '',
        contactPerson: '',
      });
      Alert.alert('Success', 'Location added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add location');
    }
  };

  const handleDeleteLocation = (id: string, name: string) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(removeLocation(id)),
        },
      ]
    );
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'hospital': return 'hospital-building';
      case 'lab': return 'flask';
      case 'clinic': return 'medical-bag';
      case 'pharmacy': return 'pill';
      default: return 'map-marker';
    }
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search locations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationName}>{item.name}</Text>
                  <Text style={styles.locationArea}>📍 {item.area}</Text>
                  <Text style={styles.locationAddress}>{item.address}</Text>
                </View>
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteLocation(item.id, item.name)}
                />
              </View>
              <View style={styles.chipRow}>
                <Chip icon={getIcon(item.type)} compact>
                  {item.type}
                </Chip>
                {item.phone && (
                  <Chip icon="phone" compact style={styles.chip}>
                    {item.phone}
                  </Chip>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No locations yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first location</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add New Location</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={styles.dialogContent}>
              <TextInput
                label="Location Name *"
                value={newLocation.name}
                onChangeText={(text) => setNewLocation({ ...newLocation, name: text })}
                mode="outlined"
                placeholder="e.g., Aga Khan Hospital"
                style={styles.input}
              />

              <TextInput
                label="Area/Region *"
                value={newLocation.area}
                onChangeText={(text) => setNewLocation({ ...newLocation, area: text })}
                mode="outlined"
                placeholder="e.g., Clifton, Gulshan, DHA"
                style={styles.input}
              />

              <TextInput
                label="Address *"
                value={newLocation.address}
                onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
                mode="outlined"
                placeholder="Full address"
                multiline
                style={styles.input}
              />

              <Text style={styles.typeLabel}>Type *</Text>
              <View style={styles.typeChips}>
                {['hospital', 'lab', 'clinic', 'pharmacy'].map((type) => (
                  <Chip
                    key={type}
                    selected={newLocation.type === type}
                    onPress={() => setNewLocation({ ...newLocation, type: type as any })}
                    style={styles.typeChip}
                  >
                    {type}
                  </Chip>
                ))}
              </View>

              <TextInput
                label="Contact Person"
                value={newLocation.contactPerson}
                onChangeText={(text) => setNewLocation({ ...newLocation, contactPerson: text })}
                mode="outlined"
                placeholder="Optional"
                style={styles.input}
              />

              <TextInput
                label="Phone"
                value={newLocation.phone}
                onChangeText={(text) => setNewLocation({ ...newLocation, phone: text })}
                mode="outlined"
                placeholder="Optional"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddLocation} loading={loading}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
  },
  card: {
    margin: 8,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationArea: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialogContent: {
    paddingHorizontal: 24,
  },
  input: {
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    marginRight: 4,
  },
});

export default LocationsScreen;
