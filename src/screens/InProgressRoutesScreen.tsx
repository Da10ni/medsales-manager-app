import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Surface, Text, Divider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const InProgressRoutesScreen = ({ route }) => {
  const { inProgressRoutes } = route.params;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <LinearGradient
          colors={["#2196F3", "#1976D2", "#0D47A1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>In-Progress Routes</Text>
          <Text style={styles.headerSubtitle}>
            Showing {inProgressRoutes.length} active routes
          </Text>
        </LinearGradient>

        {/* Route Cards */}
        {inProgressRoutes.map((route) => {
          const completedStops = route.stops.filter(
            (s) => s.status === "completed"
          ).length;
          const totalStops = route.stops.length;
          const progress =
            totalStops > 0
              ? Math.round((completedStops / totalStops) * 100)
              : 0;

          return (
            <Surface key={route.id} style={styles.routeCard} elevation={2}>
              <View style={styles.routeHeader}>
                <MaterialCommunityIcons
                  name="map-marker-path"
                  size={26}
                  color="#2196F3"
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.routeName}>{route.routeName}</Text>
                  <Text style={styles.repNameLabel}>
                    Assigned to: {route.salesRepName}
                  </Text>
                </View>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              {/* Progress */}
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>Progress</Text>
                <Text style={styles.progressPercent}>{progress}%</Text>
              </View>

              <View style={styles.progressBarOuter}>
                <View
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>

              <Text style={styles.stopsText}>
                {completedStops} of {totalStops} stops completed
              </Text>
            </Surface>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default InProgressRoutesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

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

  routeCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
  },

  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  routeName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
  },

  repNameLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  progressText: { fontSize: 14, color: "#666" },

  progressPercent: { fontSize: 14, fontWeight: "bold", color: "#2196F3" },

  progressBarOuter: {
    marginTop: 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#2196F3",
  },

  stopsText: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
});
