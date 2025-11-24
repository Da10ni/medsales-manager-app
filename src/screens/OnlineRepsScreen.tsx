import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Surface, Text, Avatar, Chip } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const OnlineRepsScreen = ({ route }) => {
  const { onlineReps } = route.params;

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#2196F3", "#1976D2", "#0D47A1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Online Sales Representatives</Text>
        <Text style={styles.headerSubtitle}>Real-time team performance</Text>
      </LinearGradient>

      <ScrollView>
        {onlineReps.map((rep) => (
          <Surface key={rep.id} style={styles.repCard} elevation={2}>
            <View style={styles.repHeader}>
              {/* Avatar + info */}
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
                          backgroundColor: rep.isOnline ? "#E8F5E9" : "#FFEBEE",
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

              {/* Map button */}
              {rep.isOnline && rep.currentLocation && (
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => {
                    const url = `https://www.google.com/maps?q=${rep.currentLocation.latitude},${rep.currentLocation.longitude}`;
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
          </Surface>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

export default OnlineRepsScreen;

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

  repCard: {
    margin: 16,
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
});
