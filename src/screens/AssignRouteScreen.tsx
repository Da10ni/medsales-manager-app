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

interface StopDetails {
  stopNumber: number;
  activity: string;
  customInstructions: string;
}

interface Assignment {
  salesRepId: string;
  salesRepName: string;
  stops: number[]; // Array of stop numbers (1-based)
  stopDetails: StopDetails[]; // Details for each stop
}

const activityTypes = [
  { value: 'visit', label: 'Visit', icon: 'map-marker-check', color: '#4CAF50' },
  { value: 'follow-up', label: 'Follow Up', icon: 'phone-check', color: '#2196F3' },
  { value: 'take-order', label: 'Take Order', icon: 'cart-plus', color: '#FF9800' },
  { value: 'stock-check', label: 'Stock Check', icon: 'package-variant', color: '#9C27B0' },
  { value: 'promote', label: 'Promote', icon: 'bullhorn', color: '#F44336' },
  { value: 'delivery', label: 'Delivery', icon: 'truck-delivery', color: '#00BCD4' },
];

const AssignRouteScreen = ({ navigation }: any) => {
  const { user: manager } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Step 1: Date Selection
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 2: Route Selection
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Step 3: Sales Rep & Stop Assignment
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSalesReps, setSelectedSalesReps] = useState<string[]>([]);

  // Activity Dropdown Modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [currentStop, setCurrentStop] = useState<{ repId: string; stopNumber: number } | null>(null);

  const [repDropdownVisible, setRepDropdownVisible] = useState(false);
  const [repSearchQuery, setRepSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Fetch routes and sales reps
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
    });

    const duplicates: string[] = [];
    stopAssignments.forEach((reps, stop) => {
      if (reps.length > 1) {
        duplicates.push(`Stop ${stop} (${reps.join(', ')})`);
      }
    });

    if (duplicates.length > 0) {
      Alert.alert(
        'Duplicate Assignments',
        `The following stops are assigned to multiple sales reps:\n${duplicates.join('\n')}\n\nPlease ensure each stop is assigned to only one sales rep.`
      );
      return false;
    }

    return true;
  };

  const handleAssign = async () => {
    if (!validateAssignments()) return;

    setAssigning(true);
    try {
      // Create assignments in Firestore
      for (const assignment of assignments) {
        const assignmentId = `assignment_${Date.now()}_${assignment.salesRepId}`;
        const assignedStops = assignment.stops.map((stopNumber) => {
          const dist = selectedRoute!.distributors[stopNumber - 1];
          const details = assignment.stopDetails.find((d) => d.stopNumber === stopNumber);
          return {
            ...dist,
            stopNumber,
            activity: details?.activity || 'visit',
            customInstructions: details?.customInstructions || '',
            status: 'pending',
          };
        });

        await setDoc(doc(db, 'assignments', assignmentId), {
          routeId: selectedRoute!.id,
          routeName: selectedRoute!.name,
          salesRepId: assignment.salesRepId,
          salesRepName: assignment.salesRepName,
          managerId: manager?.phone || '',
          date: Timestamp.fromDate(selectedDate),
          stops: assignedStops,
          status: 'pending',
          createdAt: Timestamp.now(),
        });
      }

      Alert.alert(
        'Success!',
        `Route "${selectedRoute!.name}" has been assigned to ${assignments.length} sales rep${assignments.length > 1 ? 's' : ''
        } for ${selectedDate.toLocaleDateString()}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error assigning route:', error);
      Alert.alert('Error', 'Failed to assign route. Please try again.');
    } finally {
      setAssigning(false);
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

<<<<<<< Updated upstream
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
=======
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Date Selection */}
        <Surface style={styles.section} elevation={2}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Select Date</Text>
          </View>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={24} color="#2196F3" />
            <Text style={styles.dateSelectorText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </Surface>

        {/* Step 2: Route Selection */}
        <Surface style={styles.section} elevation={2}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Select Route</Text>
          </View>
          {routes.length === 0 ? (
            <Text style={styles.emptyText}>No routes available</Text>
          ) : (
            routes.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeItem,
                  selectedRoute?.id === route.id && styles.routeItemSelected,
                ]}
                onPress={() => handleRouteSelect(route)}
              >
                <View style={styles.routeItemLeft}>
                  <MaterialCommunityIcons
                    name={selectedRoute?.id === route.id ? 'radiobox-marked' : 'radiobox-blank'}
                    size={24}
                    color={selectedRoute?.id === route.id ? '#2196F3' : '#999'}
                  />
                  <View style={styles.routeItemInfo}>
                    <Text style={styles.routeItemName}>{route.name}</Text>
                    <Text style={styles.routeItemStops}>
                      {route.distributors.length} stops
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Surface>

        {/* Step 3: Sales Rep & Stop Assignment */}
        {selectedRoute && (
          <Surface style={styles.section} elevation={2}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>Assign Stops to Sales Reps</Text>
            </View>

            {/* Sales Rep Selection */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setRepDropdownVisible(true)}
            >
              <Text style={styles.dropdownButtonText}>
                {selectedSalesReps.length === 0
                  ? "Select Sales Representatives"
                  : `${selectedSalesReps.length} selected`}
              </Text>

              <MaterialCommunityIcons name="chevron-down" size={22} color="#555" />
            </TouchableOpacity>

            {/* Sales Rep Selection  Modal */}
            <Modal
              visible={repDropdownVisible}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setRepDropdownVisible(false)}
            >
              <View style={styles.fullScreenModal}>

                {/* Header Section */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setRepDropdownVisible(false)}>
                    <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
                  </TouchableOpacity>

                  <Text style={styles.modalHeaderText}>Select Sales Representative</Text>
                </View>


                <View style={[styles.searchContainer, isFocused && styles.focused]}>
                  <MaterialCommunityIcons name="magnify" size={22} color={isFocused ? '#2196F3' : '#777'} style={styles.icon} />
                  <TextInput
                    placeholder="Search name or number..."
                    value={repSearchQuery}
                    onChangeText={setRepSearchQuery}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={styles.searchInput}
                  />
                </View>

                {/* Scrollable List */}
                <ScrollView>
                  {salesReps
                    .filter(
                      rep =>
                        rep.name.toLowerCase().includes(repSearchQuery.toLowerCase()) ||
                        rep.phone.includes(repSearchQuery)
                    )
                    .map(rep => (
                      <TouchableOpacity
                        key={rep.id}
                        style={styles.modalRow}
                        onPress={() => {
                          handleSalesRepToggle(rep.id);
                          setRepDropdownVisible(false);
                          setRepSearchQuery('');
                        }}
                      >
                        <View>
                          <Text style={styles.salesRepName}>{rep.name}</Text>
                          <Text style={styles.salesRepPhone}>{rep.phone}</Text>
                        </View>

                        <Checkbox
                          status={selectedSalesReps.includes(rep.id) ? 'checked' : 'unchecked'}
                          color="#2196F3"
                        />
                      </TouchableOpacity>
                    ))}
                </ScrollView>

              </View>
            </Modal>

            <Divider style={styles.divider} />

            {/* Stop Assignment for each selected rep */}
            {assignments.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Assign Stops & Activities</Text>
                {assignments.map((assignment) => (
                  <View key={assignment.salesRepId} style={styles.assignmentCard}>
                    <View style={styles.assignmentHeader}>
                      <Text style={styles.assignmentRepName}>{assignment.salesRepName}</Text>
                      <View style={styles.assignmentActions}>
                        <Button
                          mode="text"
                          onPress={() => handleSelectAllStops(assignment.salesRepId)}
                          compact
                          textColor="#2196F3"
                        >
                          Select All
                        </Button>
                        <Button
                          mode="text"
                          onPress={() => handleDeselectAllStops(assignment.salesRepId)}
                          compact
                          textColor="#F44336"
                        >
                          Clear
                        </Button>
                      </View>
                    </View>

                    {/* Stop List with Activity & Instructions */}
                    <View style={styles.stopsList}>
                      {selectedRoute.distributors.map((dist, idx) => {
                        const stopNumber = idx + 1;
                        const isSelected = assignment.stops.includes(stopNumber);
                        const stopDetails = getStopDetails(assignment.salesRepId, stopNumber);
                        const activityInfo = stopDetails ? getActivityInfo(stopDetails.activity) : activityTypes[0];

                        return (
                          <View key={dist.id} style={styles.stopItemContainer}>
                            {/* Stop Header with Checkbox */}
                            <View style={styles.stopHeader}>
                              <Checkbox
                                status={isSelected ? 'checked' : 'unchecked'}
                                onPress={() => handleStopToggle(assignment.salesRepId, stopNumber)}
                                color="#2196F3"
                              />
                              <View style={styles.stopHeaderInfo}>
                                <Text style={styles.stopNumber}>Stop {stopNumber}</Text>
                                <Text style={styles.stopName}>{dist.name}</Text>
                                <Text style={styles.stopAddress} numberOfLines={1}>
                                  {dist.address}
                                </Text>
                              </View>
                            </View>

                            {/* Activity & Instructions (only if selected) */}
                            {isSelected && (
                              <View style={styles.stopDetails}>
                                {/* Activity Dropdown */}
                                <Text style={styles.fieldLabel}>Activity Type</Text>
                                <TouchableOpacity
                                  style={styles.activitySelector}
                                  onPress={() => {
                                    setCurrentStop({ repId: assignment.salesRepId, stopNumber });
                                    setShowActivityModal(true);
                                  }}
                                >
                                  <MaterialCommunityIcons
                                    name={activityInfo.icon as any}
                                    size={20}
                                    color={activityInfo.color}
                                  />
                                  <Text style={styles.activityText}>{activityInfo.label}</Text>
                                  <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                                </TouchableOpacity>

                                {/* Custom Instructions */}
                                <Text style={styles.fieldLabel}>Custom Instructions</Text>
                                <TextInput
                                  mode="outlined"
                                  placeholder="Enter custom instructions for this stop (optional)"
                                  value={stopDetails?.customInstructions || ''}
                                  onChangeText={(text) =>
                                    handleInstructionsChange(assignment.salesRepId, stopNumber, text)
                                  }
                                  multiline
                                  numberOfLines={2}
                                  style={styles.instructionsInput}
                                  outlineColor="#E0E0E0"
                                  activeOutlineColor="#2196F3"
                                />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    {assignment.stops.length > 0 && (
                      <View style={styles.selectedStopsInfo}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.selectedStopsText}>
                          {assignment.stops.length} stop{assignment.stops.length > 1 ? 's' : ''} assigned
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </Surface>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Assign Button */}
      {selectedRoute && assignments.length > 0 && (
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleAssign}
            loading={assigning}
            disabled={assigning}
            style={styles.assignButton}
            buttonColor="#2196F3"
            icon="check"
          >
            {assigning ? 'Assigning...' : 'Assign Route'}
          </Button>
        </View>
      )}

      {/* Activity Selection Modal */}
      <Modal
        visible={showActivityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActivityModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Activity Type</Text>
            <Divider style={styles.modalDivider} />
            {activityTypes.map((activity) => (
              <TouchableOpacity
                key={activity.value}
                style={styles.activityOption}
                onPress={() => handleActivitySelect(activity.value)}
              >
                <MaterialCommunityIcons
                  name={activity.icon as any}
                  size={24}
                  color={activity.color}
                />
                <Text style={styles.activityOptionText}>{activity.label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            ))}
            <Button
              mode="text"
              onPress={() => setShowActivityModal(false)}
              style={styles.modalCancelButton}
            >
              Cancel
            </Button>
          </View>
        </TouchableOpacity>
      </Modal>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
    marginLeft: 8,
  },
  stopNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 2,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: 12,
    color: '#666',
  },
  stopDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  activitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  activityText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  instructionsInput: {
    backgroundColor: '#FFF',
    fontSize: 14,
    marginBottom: 8,
    paddingTop:20,
  },
  selectedStopsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  selectedStopsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#2E7D32',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  footer: {
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======

  fullScreenModal: {
    flex: 1,
    backgroundColor: "#fff",
  },

  modalHeader: {
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  repName: {
    fontSize: 16,
    fontWeight: "500",
  },
  repNumber: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },

  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 15,
    margin: 12,
    borderRadius: 8,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    height: '100%',
  },
  icon: {
    marginRight: 10,
  },

>>>>>>> Stashed changes
});

export default AssignRouteScreen;
