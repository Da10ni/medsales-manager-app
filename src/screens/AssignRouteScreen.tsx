import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  Chip,
  Button,
  ActivityIndicator,
  Checkbox,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface Route {
  id: string;
  name: string;
  description: string;
  distributors: Distributor[];
}

interface Distributor {
  id: string;
  name: string;
  address: string;
  type: string;
  routeType: string;
  order: number;
}

interface SalesRep {
  id: string;
  name: string;
  phone: string;
}

interface Assignment {
  salesRepId: string;
  salesRepName: string;
  stops: number[]; // Array of stop numbers (1-based)
}

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

  // Fetch routes and sales reps
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch routes
        const routesQuery = query(collection(db, 'routes'), orderBy('createdAt', 'desc'));
        const routesSnapshot = await getDocs(routesQuery);
        const routesData = routesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Route[];
        setRoutes(routesData);

        // Fetch sales reps
        const salesRepsQuery = query(collection(db, 'salesReps'), orderBy('name', 'asc'));
        const salesRepsSnapshot = await getDocs(salesRepsQuery);
        const salesRepsData = salesRepsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SalesRep[];
        setSalesReps(salesRepsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load routes and sales reps');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    // Initialize all stops as selected for the first sales rep (if any selected)
    if (selectedSalesReps.length > 0) {
      const allStops = route.distributors.map((_, index) => index + 1);
      setAssignments([
        {
          salesRepId: selectedSalesReps[0],
          salesRepName: salesReps.find((r) => r.id === selectedSalesReps[0])?.name || '',
          stops: allStops,
        },
      ]);
    }
  };

  const handleSalesRepToggle = (repId: string) => {
    if (selectedSalesReps.includes(repId)) {
      // Remove rep
      setSelectedSalesReps(selectedSalesReps.filter((id) => id !== repId));
      setAssignments(assignments.filter((a) => a.salesRepId !== repId));
    } else {
      // Add rep
      setSelectedSalesReps([...selectedSalesReps, repId]);
      const rep = salesReps.find((r) => r.id === repId);
      if (rep) {
        // If this is the first rep and a route is selected, assign all stops
        if (selectedSalesReps.length === 0 && selectedRoute) {
          const allStops = selectedRoute.distributors.map((_, index) => index + 1);
          setAssignments([
            {
              salesRepId: repId,
              salesRepName: rep.name,
              stops: allStops,
            },
          ]);
        } else {
          // Add rep with no stops
          setAssignments([
            ...assignments,
            {
              salesRepId: repId,
              salesRepName: rep.name,
              stops: [],
            },
          ]);
        }
      }
    }
  };

  const handleStopToggle = (repId: string, stopNumber: number) => {
    setAssignments(
      assignments.map((assignment) => {
        if (assignment.salesRepId === repId) {
          if (assignment.stops.includes(stopNumber)) {
            // Remove stop
            return {
              ...assignment,
              stops: assignment.stops.filter((s) => s !== stopNumber),
            };
          } else {
            // Add stop and sort
            return {
              ...assignment,
              stops: [...assignment.stops, stopNumber].sort((a, b) => a - b),
            };
          }
        }
        return assignment;
      })
    );
  };

  const handleSelectAllStops = (repId: string) => {
    if (!selectedRoute) return;
    const allStops = selectedRoute.distributors.map((_, index) => index + 1);
    setAssignments(
      assignments.map((assignment) => {
        if (assignment.salesRepId === repId) {
          return { ...assignment, stops: allStops };
        }
        return assignment;
      })
    );
  };

  const handleDeselectAllStops = (repId: string) => {
    setAssignments(
      assignments.map((assignment) => {
        if (assignment.salesRepId === repId) {
          return { ...assignment, stops: [] };
        }
        return assignment;
      })
    );
  };

  const validateAssignments = () => {
    if (!selectedRoute) {
      Alert.alert('Route Required', 'Please select a route');
      return false;
    }

    if (assignments.length === 0) {
      Alert.alert('Sales Rep Required', 'Please select at least one sales rep');
      return false;
    }

    // Check if all stops are assigned
    const allStops = new Set<number>();
    assignments.forEach((assignment) => {
      assignment.stops.forEach((stop) => allStops.add(stop));
    });

    const totalStops = selectedRoute.distributors.length;
    if (allStops.size !== totalStops) {
      Alert.alert(
        'Incomplete Assignment',
        `You have only assigned ${allStops.size} out of ${totalStops} stops. Please assign all stops before continuing.`
      );
      return false;
    }

    // Check for duplicate assignments
    const stopAssignments = new Map<number, string[]>();
    assignments.forEach((assignment) => {
      assignment.stops.forEach((stop) => {
        if (!stopAssignments.has(stop)) {
          stopAssignments.set(stop, []);
        }
        stopAssignments.get(stop)?.push(assignment.salesRepName);
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
          return {
            ...dist,
            stopNumber,
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
        'Success! <‰',
        `Route "${selectedRoute!.name}" has been assigned to ${assignments.length} sales rep${
          assignments.length > 1 ? 's' : ''
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>Assign Route</Text>
          <Text style={styles.headerSubtitle}>Select date, route, and assign stops to sales reps</Text>
        </View>
      </LinearGradient>

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
            <Text style={styles.subsectionTitle}>Select Sales Representatives</Text>
            {salesReps.length === 0 ? (
              <Text style={styles.emptyText}>No sales reps available</Text>
            ) : (
              salesReps.map((rep) => (
                <TouchableOpacity
                  key={rep.id}
                  style={styles.salesRepItem}
                  onPress={() => handleSalesRepToggle(rep.id)}
                >
                  <Checkbox
                    status={selectedSalesReps.includes(rep.id) ? 'checked' : 'unchecked'}
                    onPress={() => handleSalesRepToggle(rep.id)}
                    color="#2196F3"
                  />
                  <View style={styles.salesRepInfo}>
                    <Text style={styles.salesRepName}>{rep.name}</Text>
                    <Text style={styles.salesRepPhone}>{rep.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            <Divider style={styles.divider} />

            {/* Stop Assignment for each selected rep */}
            {assignments.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Assign Stops</Text>
                {assignments.map((assignment, index) => (
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

                    <View style={styles.stopsGrid}>
                      {selectedRoute.distributors.map((dist, idx) => {
                        const stopNumber = idx + 1;
                        const isSelected = assignment.stops.includes(stopNumber);
                        return (
                          <TouchableOpacity
                            key={dist.id}
                            style={[
                              styles.stopChip,
                              isSelected && styles.stopChipSelected,
                            ]}
                            onPress={() =>
                              handleStopToggle(assignment.salesRepId, stopNumber)
                            }
                          >
                            <Text
                              style={[
                                styles.stopChipText,
                                isSelected && styles.stopChipTextSelected,
                              ]}
                            >
                              {stopNumber}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {assignment.stops.length > 0 && (
                      <View style={styles.selectedStopsInfo}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.selectedStopsText}>
                          {assignment.stops.length} stop{assignment.stops.length > 1 ? 's' : ''}{' '}
                          selected: {assignment.stops.join(', ')}
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
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  dateSelectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  routeItemSelected: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  routeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeItemInfo: {
    marginLeft: 12,
  },
  routeItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routeItemStops: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  salesRepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  salesRepInfo: {
    marginLeft: 12,
  },
  salesRepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  salesRepPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
  },
  assignmentCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assignmentRepName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  stopsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stopChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  stopChipSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  stopChipText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  stopChipTextSelected: {
    color: '#FFF',
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
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  assignButton: {
    borderRadius: 12,
    paddingVertical: 6,
  },
});

export default AssignRouteScreen;
