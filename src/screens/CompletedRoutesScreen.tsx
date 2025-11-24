import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Surface, Text, Divider } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const CompletedRoutesScreen = ({ route }) => {
  const { completedStopEntries } = route.params;

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
          <Text style={styles.headerTitle}>Completed Routes</Text>
          <Text style={styles.headerSubtitle}>
            Showing {completedStopEntries.length} completed routes
          </Text>
        </LinearGradient>

        {/* Route Cards */}
        {completedStopEntries.map((entry) => (
          <Surface
            key={entry.assignmentId}
            style={styles.routeCard}
            elevation={2}
          >
            {/* Route and Rep */}
            <View style={styles.routeHeader}>
              <MaterialCommunityIcons
                name="check-circle"
                size={26}
                color="#4CAF50"
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.routeName}>{entry.routeName}</Text>
                <Text style={styles.repNameLabel}>
                  Completed by: {entry.salesRepName}
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            {/* Completed Stops List */}
            <Text style={styles.sectionTitle}>Completed Stops</Text>

            {entry.completedStops.map((stop) => (
              <View key={stop.id} style={styles.stopRow}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={20}
                  color="#4CAF50"
                />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                </View>
              </View>
            ))}

            {/* Summary */}
            <Text style={styles.summaryText}>
              {entry.completedStops.length} of {entry.totalStops} stops
              completed
            </Text>
          </Surface>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default CompletedRoutesScreen;

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

  progressPercent: { fontSize: 14, fontWeight: "bold", color: "#4CAF50" },

  progressBarOuter: {
    marginTop: 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },

  stopsText: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#555",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stopName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  stopAddress: {
    fontSize: 12,
    color: "#777",
  },
  summaryText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
  },
});
