import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Linking,
} from "react-native";
import {
  Text,
  Surface,
  Avatar,
  Chip,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { useMemo } from "react";

// Conditional import for MapView
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch (e) {
  console.log("MapView not available:", e);
}

const { width, height } = Dimensions.get("window");

interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone: string;
  isOnline: boolean;
  lastSeen: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    timestamp: Date;
  };
  lastLocationUpdate?: Date;
}

interface Assignment {
  id: string;
  routeName: string;
  salesRepId: string;
  salesRepName: string;
  date: Date;
  status: string;
  stops: any[];
}

const MetricsScreen = ({ navigation }: any) => {
  const { user: manager } = useSelector((state: RootState) => state.auth);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!manager?.phone) return;

    // Subscribe to ALL sales reps (managers can see all reps they can assign to)
    const salesRepsQuery = query(collection(db, "salesReps"));

    const unsubscribeSalesReps = onSnapshot(salesRepsQuery, (snapshot) => {
      const repsData: SalesRep[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        repsData.push({
          id: doc.id,
          name: data.name || "Unknown",
          email: data.email || "",
          phone: data.phone || "",
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen?.toDate() || new Date(),
          currentLocation: data.currentLocation
            ? {
                latitude: data.currentLocation.latitude,
                longitude: data.currentLocation.longitude,
                accuracy: data.currentLocation.accuracy || 0,
                heading: data.currentLocation.heading || null,
                speed: data.currentLocation.speed || null,
                timestamp:
                  data.currentLocation.timestamp?.toDate() || new Date(),
              }
            : undefined,
          lastLocationUpdate: data.lastLocationUpdate?.toDate(),
        });
      });
      setSalesReps(repsData);
      setLoading(false);
      setRefreshing(false);
    });

    // Subscribe to today's assignments
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("managerId", "==", manager.phone),
      where("date", ">=", Timestamp.fromDate(startOfDay)),
      where("date", "<=", Timestamp.fromDate(endOfDay))
    );

    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const assignmentsData: Assignment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        assignmentsData.push({
          id: doc.id,
          routeName: data.routeName || "Unknown Route",
          salesRepId: data.salesRepId || "",
          salesRepName: data.salesRepName || "Unknown",
          date: data.date?.toDate() || new Date(),
          status: data.status || "pending",
          stops: data.stops || [],
        });
      });
      setAssignments(assignmentsData);
    });

    return () => {
      unsubscribeSalesReps();
      unsubscribeAssignments();
    };
  }, [manager]);

  const onRefresh = () => {
    setRefreshing(true);
    // Data refreshes automatically via listeners
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getOnlineCount = () => salesReps.filter((rep) => rep.isOnline).length;
  const getTotalAssignments = () => assignments.length;
  const getCompletedAssignmentsDetailed = () => {
    const result = [];

    assignments.forEach((a) => {
      const completedStops = a.stops.filter((s) => s.status === "completed");

      // Add this assignment ONLY if ALL stops are completed
      if (a.stops.length > 0 && completedStops.length === a.stops.length) {
        result.push({
          assignmentId: a.id,
          routeName: a.routeName,
          salesRepName: a.salesRepName,
          salesRepId: a.salesRepId,
          completedStops: completedStops,
          totalStops: a.stops.length,
        });
      }
    });

    return result;
  };

  const getInProgressAssignments = () => {
    const result = [];

    assignments.forEach((a) => {
      const totalStops = a.stops.length;
      const pendingStops = a.stops.filter(
        (s) => s.status !== "completed"
      ).length;

      // Route qualifies as IN-PROGRESS:
      if (totalStops > 0 && pendingStops > 0) {
        result.push(a);
      }
    });
    // console.log("Assignments state:", assignments);

    return result;
  };

  const getRepAssignment = (repId: string) => {
    return assignments.find((a) => a.salesRepId === repId);
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getMapRegion = () => {
    if (selectedRep?.currentLocation) {
      return {
        latitude: selectedRep.currentLocation.latitude,
        longitude: selectedRep.currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // Default region (you can set this to your city)
    return {
      latitude: 24.8607,
      longitude: 67.0011,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading metrics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#2196F3", "#1976D2", "#0D47A1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Metrics & Analytics</Text>
        <Text style={styles.headerSubtitle}>Real-time team performance</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              const onlineReps = salesReps.filter((rep) => rep.isOnline);
              navigation.navigate("OnlineReps", { onlineReps });
            }}
          >
            <Surface style={styles.statCard} elevation={2}>
              <LinearGradient
                colors={["#4CAF50", "#388E3C"]}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="account-check"
                  size={32}
                  color="#FFF"
                />
                <Text style={styles.statValue}>{getOnlineCount()}</Text>
                <Text style={styles.statLabel}>Online Now</Text>
              </LinearGradient>
            </Surface>
          </TouchableOpacity>

          <Surface style={styles.statCard} elevation={2}>
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              style={styles.statGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons
                name="map-marker-path"
                size={32}
                color="#FFF"
              />
              <Text style={styles.statValue}>{getTotalAssignments()}</Text>
              <Text style={styles.statLabel}>Total Routes</Text>
            </LinearGradient>
          </Surface>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              const inProgressRoutes = getInProgressAssignments();

              navigation.navigate("InProgressRoutes", { inProgressRoutes });
            }}
          >
            <Surface style={styles.statCard} elevation={2}>
              <LinearGradient
                colors={["#FF9800", "#F57C00"]}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="progress-clock"
                  size={32}
                  color="#FFF"
                />
                <Text style={styles.statValue}>
                  {getInProgressAssignments().length}
                </Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </LinearGradient>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              const completedStopEntries = getCompletedAssignmentsDetailed();
              navigation.navigate("CompletedRoutes", { completedStopEntries });
            }}
          >
            <Surface style={styles.statCard} elevation={2}>
              <LinearGradient
                colors={["#9C27B0", "#7B1FA2"]}
                style={styles.statGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color="#FFF"
                />
                <Text style={styles.statValue}>
                  {getCompletedAssignmentsDetailed().length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </LinearGradient>
            </Surface>
          </TouchableOpacity>
        </View>

        {/* Map View Toggle */}
        {salesReps.some((rep) => rep.isOnline && rep.currentLocation) && (
          <Surface style={styles.mapToggleCard} elevation={2}>
            <TouchableOpacity
              style={styles.mapToggleButton}
              onPress={() => setShowMap(!showMap)}
            >
              <View style={styles.mapToggleLeft}>
                <MaterialCommunityIcons
                  name={showMap ? "map-marker-off" : "map-marker-check"}
                  size={24}
                  color="#2196F3"
                />
                <Text style={styles.mapToggleText}>
                  {showMap ? "Hide Map" : "Show Live Locations"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={showMap ? "chevron-up" : "chevron-down"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>

            {showMap && MapView && (
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={getMapRegion()}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                >
                  {salesReps
                    .filter((rep) => rep.isOnline && rep.currentLocation)
                    .map((rep) => (
                      <Marker
                        key={rep.id}
                        coordinate={{
                          latitude: rep.currentLocation!.latitude,
                          longitude: rep.currentLocation!.longitude,
                        }}
                        title={rep.name}
                        description={`Last updated: ${formatLastSeen(
                          rep.lastLocationUpdate || new Date()
                        )}`}
                        pinColor="#4CAF50"
                      />
                    ))}
                </MapView>
              </View>
            )}
            {showMap && !MapView && (
              <View style={styles.mapContainer}>
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    padding: 20,
                  }}
                >
                  <Text style={{ textAlign: "center", color: "#666" }}>
                    Map view is not available. Please restart the app.
                  </Text>
                </View>
              </View>
            )}
          </Surface>
        )}

        {/* Sales Reps List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sales Representatives</Text>
          <Text style={styles.sectionSubtitle}>
            {salesReps.length} total • {getOnlineCount()} online
          </Text>
        </View>

        {salesReps.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons name="account-off" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No sales representatives found</Text>
          </Surface>
        ) : (
          salesReps.map((rep) => {
            const assignment = getRepAssignment(rep.id);
            const completedStops =
              assignment?.stops.filter((s) => s.status === "completed")
                .length || 0;
            const totalStops = assignment?.stops.length || 0;

            return (
              <Surface key={rep.id} style={styles.repCard} elevation={2}>
                <View style={styles.repHeader}>
                  <View style={styles.repInfo}>
                    <View style={styles.avatarContainer}>
                      <Avatar.Text
                        size={50}
                        label={rep.name.substring(0, 2).toUpperCase()}
                        style={styles.avatar}
                      />
                      {rep.isOnline && <View style={styles.onlineDot} />}
                    </View>
                    <View style={styles.repDetails}>
                      <Text style={styles.repName}>{rep.name}</Text>
                      <Text style={styles.repPhone}>{rep.phone}</Text>
                      <View style={styles.statusRow}>
                        <Chip
                          mode="flat"
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: rep.isOnline
                                ? "#E8F5E9"
                                : "#FFEBEE",
                            },
                          ]}
                          textStyle={{
                            color: rep.isOnline ? "#4CAF50" : "#F44336",
                            fontSize: 11,
                          }}
                          icon={rep.isOnline ? "circle" : "circle-outline"}
                        >
                          {rep.isOnline ? "Online" : "Offline"}
                        </Chip>
                        <Text style={styles.lastSeenText}>
                          {formatLastSeen(rep.lastSeen)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {rep.isOnline && rep.currentLocation && (
                    <TouchableOpacity
                      style={styles.locationButton}
                      onPress={() => {
                        const url = `https://www.google.com/maps?q=${
                          rep.currentLocation!.latitude
                        },${rep.currentLocation!.longitude}`;
                        Linking.openURL(url);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={24}
                        color="#2196F3"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {assignment && (
                  <>
                    <Divider style={styles.divider} />
                    <View style={styles.assignmentSection}>
                      <View style={styles.assignmentHeader}>
                        <MaterialCommunityIcons
                          name="map-marker-path"
                          size={20}
                          color="#2196F3"
                        />
                        <Text style={styles.assignmentTitle}>
                          {assignment.routeName}
                        </Text>
                      </View>
                      <View style={styles.progressSection}>
                        <View style={styles.progressInfo}>
                          <Text style={styles.progressText}>Progress</Text>
                          <Text style={styles.progressPercent}>
                            {totalStops > 0
                              ? Math.round((completedStops / totalStops) * 100)
                              : 0}
                            %
                          </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <LinearGradient
                            colors={["#4CAF50", "#388E3C"]}
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${
                                  totalStops > 0
                                    ? (completedStops / totalStops) * 100
                                    : 0
                                }%`,
                              },
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          />
                        </View>
                        <View style={styles.stopsInfo}>
                          <Text style={styles.stopsText}>
                            {completedStops} of {totalStops} stops completed
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </Surface>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  statGradient: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
  mapToggleCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  mapToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  mapToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapToggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  mapContainer: {
    width: "100%",
    height: 300,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  emptyCard: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  repCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
  },
  repHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  repInfo: {
    flexDirection: "row",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    backgroundColor: "#2196F3",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  repDetails: {
    marginLeft: 12,
    flex: 1,
  },
  repName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  repPhone: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusChip: {
    height: 28,
  },
  lastSeenText: {
    fontSize: 12,
    color: "#999",
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    marginVertical: 12,
  },
  assignmentSection: {
    gap: 12,
  },
  assignmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  progressSection: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 13,
    color: "#666",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  stopsInfo: {
    marginTop: 4,
  },
  stopsText: {
    fontSize: 12,
    color: "#666",
  },
});

export default MetricsScreen;
