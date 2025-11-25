import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Text,
  Surface,
  Chip,
  FAB,
  TextInput,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

interface Route {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "cancelled";
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
  type: "hospital" | "pharmacy" | "clinic" | "distributor";
  routeType: "follow-up" | "visit" | "stock-check" | "promote";
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
  console.log("this is the data in routes on toppp", routes);

  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInlineDistForm, setShowInlineDistForm] = useState(false);
  const [showInlineTypePicker, setShowInlineTypePicker] = useState(false);
  const [showInlineRouteTypePicker, setShowInlineRouteTypePicker] =
    useState(false);
  const [addressError, setAddressError] = useState("");

  // Create Route Form
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [creating, setCreating] = useState(false);

  // Add Distributor Form
  const [distName, setDistName] = useState("");
  const [distAddress, setDistAddress] = useState("");
  const [distType, setDistType] = useState<
    "hospital" | "pharmacy" | "clinic" | "distributor"
  >("hospital");
  const [distRouteType, setDistRouteType] = useState<
    "follow-up" | "visit" | "stock-check" | "promote"
  >("visit");
  const [distContact, setDistContact] = useState("");
  const [distPhone, setDistPhone] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const getTypeInfo = (type: string) => {
    return (
      distributorTypes.find((t) => t.value === type) || distributorTypes[0]
    );
  };

  const getRouteTypeInfo = (type: string) => {
    return routeTypes.find((t) => t.value === type) || routeTypes[1];
  };

  const distributorTypes = [
    {
      value: "hospital",
      label: "Hospital",
      icon: "hospital-building",
      color: "#F44336",
    },
    {
      value: "pharmacy",
      label: "Pharmacy",
      icon: "pharmacy",
      color: "#4CAF50",
    },
    { value: "clinic", label: "Clinic", icon: "medical-bag", color: "#2196F3" },
    {
      value: "distributor",
      label: "Distributor",
      icon: "truck-delivery",
      color: "#FF9800",
    },
  ];

  const routeTypes = [
    {
      value: "follow-up",
      label: "Follow Up",
      icon: "phone-check",
      color: "#2196F3",
    },
    {
      value: "visit",
      label: "Visit",
      icon: "map-marker-check",
      color: "#4CAF50",
    },
    {
      value: "stock-check",
      label: "Stock Check",
      icon: "package-variant",
      color: "#FF9800",
    },
    { value: "promote", label: "Promote", icon: "bullhorn", color: "#9C27B0" },
  ];

  // const getTypeInfo = (type: string) => {
  //   return (
  //     distributorTypes.find((t) => t.value === type) || distributorTypes[0]
  //   );

  // };
  // console.log('distributorTypes',distributorTypes);

  // const getRouteTypeInfo = (type: string) => {
  //   return routeTypes.find((t) => t.value === type) || routeTypes[1];
  // };
  // console.log('getRouteTypeInfo',routeTypes);

  // const getTypeInfo = (type: string) => {
  //   return (
  //     distributorTypes.find((t) => t.value === type) || distributorTypes[0]
  //   );
  // };

  // const getRouteTypeInfo = (type: string) => {
  //   return routeTypes.find((t) => t.value === type) || routeTypes[1];
  // };

  // Debugging ke liye sahi tarike se console karen
  console.log("🔍 distributorTypes array:", distributorTypes);
  console.log("🔍 routeTypes array:", routeTypes);

  // Google Maps link validation - FIXED FOR ALL FORMATS
  const isGoogleMapsLink = (url: string) => {
    const pattern =
      /^(https?:\/\/)?(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl).+$/;
    return pattern.test(url);
  };

  // Fetch routes (managers can see all routes like admin)
  const fetchRoutes = async () => {
    try {
      const q = query(collection(db, "routes"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Route[];
      setRoutes(data);
      console.log("this is the data in setRoute or routes>>>", routes);
    } catch (error: any) {
      console.error("Error fetching routes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch sales reps (managers can see all sales reps)
  const fetchSalesReps = async () => {
    try {
      const q = query(
        collection(db, "salesReps"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SalesRep[];
      setSalesReps(data);
    } catch (error: any) {
      console.error("Error fetching sales reps:", error);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchSalesReps();

    // Real-time listener for routes (managers can see all routes)
    const q = query(collection(db, "routes"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Route[];
      setRoutes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Close all modals/pickers when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setShowAddModal(false);
        setShowInlineDistForm(false);
        setShowInlineTypePicker(false);
        setShowInlineRouteTypePicker(false);
        setAddressError("");
      };
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRoutes();
    fetchSalesReps();
  };

  // Reset form
  const resetForm = () => {
    setRouteName("");
    setRouteDescription("");
    setDistributors([]);
  };

  // Reset distributor form
  const resetDistributorForm = () => {
    setDistName("");
    setDistAddress("");
    setDistType("hospital");
    setDistRouteType("visit");
    setDistContact("");
    setDistPhone("");
    setAddressError("");
    setShowInlineTypePicker(false);
    setShowInlineRouteTypePicker(false);
  };

  // Add distributor to route - WITH UPDATED VALIDATION
  const handleAddDistributor = () => {
    if (!distName.trim()) {
      Alert.alert("Missing Info", "Please enter stop name");
      return;
    }

    if (!distAddress.trim()) {
      setAddressError("Address is required");
      Alert.alert("Missing Info", "Please enter Google Maps link");
      return;
    }

    // Validate Google Maps link - UPDATED FOR NEW FORMATS
    if (!isGoogleMapsLink(distAddress.trim())) {
      setAddressError("Please enter a valid Google Maps link");
      Alert.alert(
        "Invalid Address",
        "Please enter a valid Google Maps link.\n\nAccepted formats:\n• https://www.google.com/maps/...\n• https://maps.google.com/...\n• https://goo.gl/maps/...\n• https://maps.app.goo.gl/..."
      );
      return;
    }

    // Clear error if validation passes
    setAddressError("");

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
    setShowInlineDistForm(false);
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

  // Create route (without sales rep assignment)
  const handleCreateRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert("Name Required", "Please enter the route name");
      return;
    }

    if (distributors.length === 0) {
      Alert.alert(
        "Distributors Required",
        "Please add at least one distributor/stop"
      );
      return;
    }

    try {
      setCreating(true);
      const routeId = `route_${Date.now()}`;

      await setDoc(doc(db, "routes", routeId), {
        name: routeName.trim(),
        description: routeDescription.trim(),
        distributors: distributors,
        isActive: true,
        createdBy: manager?.phone || "",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      Alert.alert(
        "Success! 🎉",
        `Route "${routeName}" has been created successfully!`
      );
      setShowAddModal(false);
      resetForm();
      fetchRoutes();
    } catch (error: any) {
      console.error("Error creating route:", error);
      Alert.alert("Error", error.message || "Failed to create route");
    } finally {
      setCreating(false);
    }
  };

  // Edit route
  const handleEditRoute = (route: Route) => {
    setSelectedRoute(route);
    setRouteName(route.name);
    setRouteDescription(route.description || "");
    setDistributors(route.distributors || []);
    setShowEditModal(true);
  };

  // Update route
  const handleUpdateRoute = async () => {
    if (!selectedRoute) return;

    if (!routeName.trim()) {
      Alert.alert("Name Required", "Please enter the route name");
      return;
    }

    if (distributors.length === 0) {
      Alert.alert(
        "Distributors Required",
        "Please add at least one distributor/stop"
      );
      return;
    }

    try {
      setCreating(true);

      await setDoc(
        doc(db, "routes", selectedRoute.id),
        {
          name: routeName.trim(),
          description: routeDescription.trim(),
          distributors: distributors,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      Alert.alert("Success! ✅", `Route "${routeName}" has been updated!`);
      setShowEditModal(false);
      resetForm();
      fetchRoutes();
    } catch (error: any) {
      console.error("Error updating route:", error);
      Alert.alert("Error", error.message || "Failed to update route");
    } finally {
      setCreating(false);
    }
  };

  // Delete route
  const handleDeleteRoute = (routeId: string, routeName: string) => {
    Alert.alert(
      "Delete Route",
      `Are you sure you want to delete "${routeName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "routes", routeId));
              Alert.alert("Deleted", "Route has been deleted");
              fetchRoutes();
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete route");
            }
          },
        },
      ]
    );
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
        colors={["#2196F3", "#1976D2", "#0D47A1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Routes</Text>
              <Text style={styles.headerSubtitle}>
                Manage and create routes
              </Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {routes.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={1}>
            <MaterialCommunityIcons
              name="map-marker-off"
              size={80}
              color="#E0E0E0"
            />
            <Text style={styles.emptyTitle}>No Routes Found</Text>
            <Text style={styles.emptySubtitle}>
              Create your first route to get started
            </Text>
          </Surface>
        ) : (
          routes.map((route) => (
            <Surface key={route.id} style={styles.routeCard} elevation={2}>
              <View style={styles.routeHeader}>
                <View style={styles.routeHeaderLeft}>
                  <MaterialCommunityIcons
                    name="map-marker-path"
                    size={24}
                    color="#2196F3"
                  />
                  <View style={styles.routeTitleSection}>
                    <Text style={styles.routeName}>{route.name}</Text>
                    {route.description && (
                      <Text style={styles.routeDescription}>
                        {route.description}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleEditRoute(route)}
                  style={styles.actionButton}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color="#2196F3"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteRoute(route.id, route.name)}
                  style={styles.deleteButton}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={20}
                    color="#F44336"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={16}
                    color="#666"
                  />
                  <Text style={styles.infoText}>
                    {route.distributors.length} stops
                  </Text>
                </View>
              </View>

              {/* Distributors/Stops */}
              <View style={styles.distributorsSection}>
                <Text style={styles.stopsTitle}>
                  Stops ({route.distributors.length})
                </Text>

                {route.distributors.map((dist, index) => {
                  const typeInfo = getTypeInfo(dist.type);
                  const routeTypeInfo = getRouteTypeInfo(dist.routeType);

                  return (
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
                              {
                                backgroundColor: typeInfo.color + "20",
                                height: 30, 
                              },
                            ]}
                            textStyle={{
                              color: typeInfo.color,
                              fontSize: 10,
                              fontWeight: "500",
                            }}
                            icon={() => (
                              <MaterialCommunityIcons
                                name={typeInfo.icon}
                                size={14}
                                color={typeInfo.color}
                              />
                            )}
                            compact={false} 
                          >
                            {typeInfo.label}
                          </Chip>

                          <Chip
                            mode="flat"
                            style={[
                              styles.stopTypeChip,
                              {
                                backgroundColor: routeTypeInfo.color + "20",
                                height: 30, 
                              },
                            ]}
                            textStyle={{
                              color: routeTypeInfo.color,
                              fontSize: 10,
                              fontWeight: "500",
                            }}
                            icon={() => (
                              <MaterialCommunityIcons
                                name={routeTypeInfo.icon}
                                size={14}
                                color={routeTypeInfo.color}
                              />
                            )}
                            compact={false} 
                          >
                            {routeTypeInfo.label}
                          </Chip>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View style={styles.routeFooter}>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor:
                        (route.isActive ? "#4CAF50" : "#9E9E9E") + "20",
                    },
                  ]}
                  textStyle={{
                    color: route.isActive ? "#4CAF50" : "#9E9E9E",
                    fontSize: 12,
                  }}
                >
                  {route.isActive ? "ACTIVE" : "INACTIVE"}
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
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowInlineDistForm(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <MaterialCommunityIcons
                name="map-marker-plus"
                size={32}
                color="#FFF"
              />
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

              {/* Distributors */}
              <View style={styles.distributorsHeader}>
                <Text style={styles.inputLabel}>
                  Stops ({distributors.length})
                </Text>
                <Button
                  mode="contained"
                  onPress={() => {
                    console.log(
                      "🟢 Add Stop button pressed - showing inline form"
                    );
                    // Close any open pickers
                    setShowInlineTypePicker(false);
                    setShowInlineRouteTypePicker(false);
                    // Show inline form instead of modal (iOS fix)
                    setShowInlineDistForm(true);
                  }}
                  style={styles.addDistButton}
                  buttonColor="#2196F3"
                  icon="plus"
                  compact
                >
                  Add Stop
                </Button>
              </View>

              {/* Inline Add Stop Form (iOS Fix - no nested modals) */}
              {showInlineDistForm && (
                <Surface style={styles.inlineDistForm} elevation={2}>
                  <View style={styles.inlineDistFormHeader}>
                    <Text style={styles.inlineDistFormTitle}>Add Stop</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowInlineDistForm(false);
                        setShowInlineTypePicker(false);
                        setShowInlineRouteTypePicker(false);
                        setAddressError("");
                        resetDistributorForm();
                      }}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>

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
                  <TouchableOpacity
                    style={styles.typeSelector}
                    onPress={() => {
                      setShowInlineTypePicker(!showInlineTypePicker);
                      setShowInlineRouteTypePicker(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={getTypeInfo(distType).icon as any}
                      size={20}
                      color={getTypeInfo(distType).color}
                    />
                    <Text style={styles.typeSelectorText}>
                      {getTypeInfo(distType).label}
                    </Text>
                    <MaterialCommunityIcons
                      name={
                        showInlineTypePicker ? "chevron-up" : "chevron-down"
                      }
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {/* Inline Type Picker */}
                  {showInlineTypePicker && (
                    <View style={styles.inlinePickerContainer}>
                      {distributorTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.inlinePickerItem,
                            distType === type.value &&
                              styles.inlinePickerItemSelected,
                          ]}
                          onPress={() => {
                            setDistType(type.value as any);
                            setShowInlineTypePicker(false);
                          }}
                        >
                          <MaterialCommunityIcons
                            name={type.icon as any}
                            size={20}
                            color={
                              distType === type.value ? type.color : "#666"
                            }
                          />
                          <Text
                            style={[
                              styles.inlinePickerItemText,
                              distType === type.value && {
                                color: type.color,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {type.label}
                          </Text>
                          {distType === type.value && (
                            <MaterialCommunityIcons
                              name="check"
                              size={20}
                              color={type.color}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Route Type *</Text>
                  <TouchableOpacity
                    style={styles.typeSelector}
                    onPress={() => {
                      setShowInlineRouteTypePicker(!showInlineRouteTypePicker);
                      setShowInlineTypePicker(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={getRouteTypeInfo(distRouteType).icon as any}
                      size={20}
                      color={getRouteTypeInfo(distRouteType).color}
                    />
                    <Text style={styles.typeSelectorText}>
                      {getRouteTypeInfo(distRouteType).label}
                    </Text>
                    <MaterialCommunityIcons
                      name={
                        showInlineRouteTypePicker
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {/* Inline Route Type Picker */}
                  {showInlineRouteTypePicker && (
                    <View style={styles.inlinePickerContainer}>
                      {routeTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.inlinePickerItem,
                            distRouteType === type.value &&
                              styles.inlinePickerItemSelected,
                          ]}
                          onPress={() => {
                            setDistRouteType(type.value as any);
                            setShowInlineRouteTypePicker(false);
                          }}
                        >
                          <MaterialCommunityIcons
                            name={type.icon as any}
                            size={20}
                            color={
                              distRouteType === type.value ? type.color : "#666"
                            }
                          />
                          <Text
                            style={[
                              styles.inlinePickerItemText,
                              distRouteType === type.value && {
                                color: type.color,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {type.label}
                          </Text>
                          {distRouteType === type.value && (
                            <MaterialCommunityIcons
                              name="check"
                              size={20}
                              color={type.color}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Google Maps Link *</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="https://maps.app.goo.gl/..."
                    value={distAddress}
                    onChangeText={(text) => {
                      setDistAddress(text);
                      setAddressError("");
                    }}
                    style={styles.textInput}
                    outlineColor={addressError ? "#F44336" : "#E0E0E0"}
                    activeOutlineColor={addressError ? "#F44336" : "#2196F3"}
                    error={!!addressError}
                    multiline
                    numberOfLines={2}
                  />
                  {addressError ? (
                    <Text style={styles.errorText}>{addressError}</Text>
                  ) : (
                    <Text style={styles.helperText}>
                      Supported formats: google.com/maps, maps.google.com,
                      goo.gl/maps, maps.app.goo.gl
                    </Text>
                  )}

                  <Text style={styles.inputLabel}>
                    Contact Person (Optional)
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Contact name"
                    value={distContact}
                    onChangeText={setDistContact}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#2196F3"
                  />

                  <Text style={styles.inputLabel}>
                    Contact Phone (Optional)
                  </Text>
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

                  <View style={styles.inlineDistFormButtons}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        handleAddDistributor();
                        setShowInlineDistForm(false);
                      }}
                      // style={styles.distAddBtn}
                      buttonColor="#2196F3"
                    >
                      Add Stop
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowInlineDistForm(false);
                        resetDistributorForm();
                      }}
                      // style={styles.distCancelBtn}
                      textColor="#666"
                    >
                      Cancel
                    </Button>
                  </View>
                </Surface>
              )}

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
                              {
                                backgroundColor:
                                  getTypeInfo(dist.type).color + "20",
                              },
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
                              styles.distItemChip,
                              {
                                backgroundColor:
                                  getRouteTypeInfo(dist.routeType).color + "20",
                              },
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
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={24}
                        color="#F44336"
                      />
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
                  {creating ? "Creating..." : "Create Route"}
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

      {/* Edit Route Modal */}

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowInlineDistForm(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            <LinearGradient
              colors={["#2196F3", "#1976D2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <MaterialCommunityIcons
                name="map-marker-plus"
                size={32}
                color="#FFF"
              />
              <Text style={styles.modalTitle}>Edit Route</Text>
              <Text style={styles.modalSubtitle}>Update route details</Text>
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

              {/* Distributors */}
              <View style={styles.distributorsHeader}>
                <Text style={styles.inputLabel}>
                  Stops ({distributors.length})
                </Text>
                <Button
                  mode="contained"
                  onPress={() => {
                    console.log(
                      "🟢 Add Stop button pressed - showing inline form"
                    );
                    // Close any open pickers
                    setShowInlineTypePicker(false);
                    setShowInlineRouteTypePicker(false);
                    // Show inline form instead of modal (iOS fix)
                    setShowInlineDistForm(true);
                  }}
                  style={styles.addDistButton}
                  buttonColor="#2196F3"
                  icon="plus"
                  compact
                >
                  Add Stop
                </Button>
              </View>

              {/* Inline Add Stop Form (iOS Fix - no nested modals) */}
              {showInlineDistForm && (
                <Surface style={styles.inlineDistForm} elevation={2}>
                  <View style={styles.inlineDistFormHeader}>
                    <Text style={styles.inlineDistFormTitle}>Add Stop</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowInlineDistForm(false);
                        setShowInlineTypePicker(false);
                        setShowInlineRouteTypePicker(false);
                        setAddressError("");
                        resetDistributorForm();
                      }}
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>

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
                  <TouchableOpacity
                    style={styles.typeSelector}
                    onPress={() => {
                      setShowInlineTypePicker(!showInlineTypePicker);
                      setShowInlineRouteTypePicker(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={getTypeInfo(distType).icon as any}
                      size={20}
                      color={getTypeInfo(distType).color}
                    />
                    <Text style={styles.typeSelectorText}>
                      {getTypeInfo(distType).label}
                    </Text>
                    <MaterialCommunityIcons
                      name={
                        showInlineTypePicker ? "chevron-up" : "chevron-down"
                      }
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {/* Inline Type Picker */}
                  {showInlineTypePicker && (
                    <View style={styles.inlinePickerContainer}>
                      {distributorTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.inlinePickerItem,
                            distType === type.value &&
                              styles.inlinePickerItemSelected,
                          ]}
                          onPress={() => {
                            setDistType(type.value as any);
                            setShowInlineTypePicker(false);
                          }}
                        >
                          <MaterialCommunityIcons
                            name={type.icon as any}
                            size={20}
                            color={
                              distType === type.value ? type.color : "#666"
                            }
                          />
                          <Text
                            style={[
                              styles.inlinePickerItemText,
                              distType === type.value && {
                                color: type.color,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {type.label}
                          </Text>
                          {distType === type.value && (
                            <MaterialCommunityIcons
                              name="check"
                              size={20}
                              color={type.color}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Route Type *</Text>
                  <TouchableOpacity
                    style={styles.typeSelector}
                    onPress={() => {
                      setShowInlineRouteTypePicker(!showInlineRouteTypePicker);
                      setShowInlineTypePicker(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={getRouteTypeInfo(distRouteType).icon as any}
                      size={20}
                      color={getRouteTypeInfo(distRouteType).color}
                    />
                    <Text style={styles.typeSelectorText}>
                      {getRouteTypeInfo(distRouteType).label}
                    </Text>
                    <MaterialCommunityIcons
                      name={
                        showInlineRouteTypePicker
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {/* Inline Route Type Picker */}
                  {showInlineRouteTypePicker && (
                    <View style={styles.inlinePickerContainer}>
                      {routeTypes.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.inlinePickerItem,
                            distRouteType === type.value &&
                              styles.inlinePickerItemSelected,
                          ]}
                          onPress={() => {
                            setDistRouteType(type.value as any);
                            setShowInlineRouteTypePicker(false);
                          }}
                        >
                          <MaterialCommunityIcons
                            name={type.icon as any}
                            size={20}
                            color={
                              distRouteType === type.value ? type.color : "#666"
                            }
                          />
                          <Text
                            style={[
                              styles.inlinePickerItemText,
                              distRouteType === type.value && {
                                color: type.color,
                                fontWeight: "600",
                              },
                            ]}
                          >
                            {type.label}
                          </Text>
                          {distRouteType === type.value && (
                            <MaterialCommunityIcons
                              name="check"
                              size={20}
                              color={type.color}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Google Maps Link *</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="https://maps.app.goo.gl/..."
                    value={distAddress}
                    onChangeText={(text) => {
                      setDistAddress(text);
                      setAddressError("");
                    }}
                    style={styles.textInput}
                    outlineColor={addressError ? "#F44336" : "#E0E0E0"}
                    activeOutlineColor={addressError ? "#F44336" : "#2196F3"}
                    error={!!addressError}
                    multiline
                    numberOfLines={2}
                  />
                  {addressError ? (
                    <Text style={styles.errorText}>{addressError}</Text>
                  ) : (
                    <Text style={styles.helperText}>
                      Supported formats: google.com/maps, maps.google.com,
                      goo.gl/maps, maps.app.goo.gl
                    </Text>
                  )}

                  <Text style={styles.inputLabel}>
                    Contact Person (Optional)
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder="Contact name"
                    value={distContact}
                    onChangeText={setDistContact}
                    style={styles.textInput}
                    outlineColor="#E0E0E0"
                    activeOutlineColor="#2196F3"
                  />

                  <Text style={styles.inputLabel}>
                    Contact Phone (Optional)
                  </Text>
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

                  <View style={styles.inlineDistFormButtons}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        handleAddDistributor();
                        setShowInlineDistForm(false);
                      }}
                      // style={styles.distAddBtn}
                      buttonColor="#2196F3"
                    >
                      Add Stop
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowInlineDistForm(false);
                        resetDistributorForm();
                        setShowEditModal(false);
                      }}
                      // style={styles.distCancelBtn}
                      textColor="#666"
                    >
                      Cancel
                    </Button>
                  </View>
                </Surface>
              )}

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
                              {
                                backgroundColor:
                                  getTypeInfo(dist.type).color + "20",
                              },
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
                              styles.distItemChip,
                              {
                                backgroundColor:
                                  getRouteTypeInfo(dist.routeType).color + "20",
                              },
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
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={24}
                        color="#F44336"
                      />
                    </TouchableOpacity>
                  </View>
                </Surface>
              ))}

              {/* Action Buttons */}
              <View style={styles.modalButtons}>
                <Button
                  mode="contained"
                  onPress={handleUpdateRoute}
                  loading={creating}
                  disabled={creating}
                  style={styles.createButton}
                  buttonColor="#2196F3"
                >
                  {creating ? "updating..." : "Update Route"}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowEditModal(false);
                    resetForm();
                    setShowEditModal(false);
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
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  countBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
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
    backgroundColor: "#FFF",
    alignItems: "center",
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  routeCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  routeHeaderLeft: {
    flexDirection: "row",
    flex: 1,
  },
  routeTitleSection: {
    marginLeft: 12,
    flex: 1,
  },
  routeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  routeDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
  },
  routeInfo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  distributorsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  stopItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stopOrder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stopOrderText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  stopTags: {
    flexDirection: "row",
    gap: 6,
  },
  stopTypeChip: {
    height: 20,
  },
  moreStops: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  routeFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statusChip: {
    height: 28,
    alignSelf: "flex-start",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "#2196F3",
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
  modalForm: {
    flex: 1,
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  distributorsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  addDistButton: {
    borderRadius: 8,
  },
  distItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  distItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  distItemLeft: {
    flexDirection: "row",
    flex: 1,
  },
  distOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  distOrderText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  distItemName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  distItemAddress: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  distItemTags: {
    flexDirection: "row",
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
    borderColor: "#E0E0E0",
  },
  typeSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    backgroundColor: "#FFF",
    marginBottom: 8,
  },
  typeSelectorText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },
  // Inline form styles (iOS fix for nested modals)
  inlineDistForm: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  inlineDistFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  inlineDistFormTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196F3",
  },
  inlineDistFormButtons: {
    marginTop: 16,
    gap: 12,
  },
  // Inline Type/Route Type Picker (iOS fix)
  inlinePickerContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inlinePickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 12,
  },
  inlinePickerItemSelected: {
    backgroundColor: "#E3F2FD",
  },
  inlinePickerItemText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  // Error text style
  errorText: {
    fontSize: 12,
    color: "#F44336",
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },
  // Helper text style
  helperText: {
    fontSize: 11,
    color: "#666",
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
    fontStyle: "italic",
  },
  actionButton: {
    padding: 2,
  },
});

export default RoutesScreen;
