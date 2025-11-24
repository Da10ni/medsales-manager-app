import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Avatar,
  Surface,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

const { width } = Dimensions.get('window');

const ModernDashboardScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const { user: manager } = useSelector((state: RootState) => state.auth);
  const [totalSalesReps, setTotalSalesReps] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState(0);

  // Fetch dynamic stats
  useEffect(() => {
    if (!manager?.phone) return;

    // Listen to all sales reps
    const salesRepsQuery = query(collection(db, 'salesReps'));

    const unsubscribeSalesReps = onSnapshot(salesRepsQuery, (snapshot) => {
      setTotalSalesReps(snapshot.size);
    });

    // Listen to active routes assigned by this manager
    const routesQuery = query(
      collection(db, 'routes'),
      where('managerId', '==', manager.phone),
      where('status', '==', 'active')
    );

    const unsubscribeRoutes = onSnapshot(routesQuery, (snapshot) => {
      setActiveRoutes(snapshot.size);
    });

    return () => {
      unsubscribeSalesReps();
      unsubscribeRoutes();
    };
  }, [manager?.phone]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Data refreshes automatically via onSnapshot listeners
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#2196F3', '#1976D2', '#0D47A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>Hello, Welcome Back! 👋</Text>
            <Text style={styles.userName}>
              {manager?.name || manager?.phone || 'Manager'}
            </Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarContainer}
          >
            {manager?.photoURL ? (
              <Avatar.Image size={70} source={{ uri: manager.photoURL }} style={styles.avatar} />
            ) : (
              <Avatar.Icon size={70} icon="account" style={styles.avatar} color="#FFF" />
            )}
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Surface style={styles.statCard} elevation={0}>
            <LinearGradient
              colors={['#2196F3', '#1E88E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="account-group" size={32} color="#FFF" />
              <Text style={styles.statValue}>{totalSalesReps}</Text>
              <Text style={styles.statLabel}>Sales Reps</Text>
            </LinearGradient>
          </Surface>

          <Surface style={styles.statCard} elevation={0}>
            <LinearGradient
              colors={['#4CAF50', '#43A047']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <MaterialCommunityIcons name="map-marker-path" size={32} color="#FFF" />
              <Text style={styles.statValue}>{activeRoutes}</Text>
              <Text style={styles.statLabel}>Active Routes</Text>
            </LinearGradient>
          </Surface>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('SalesReps')}
            >
              <LinearGradient
                colors={['#673AB7', '#5E35B1']}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="account-group" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Sales Reps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('AssignRoute')}
            >
              <LinearGradient
                colors={['#00BCD4', '#0097A7']}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="map-marker-plus" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Assign Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Metrics')}
            >
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="chart-box" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Metrics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('Profile')}
            >
              <LinearGradient
                colors={['#3F51B5', '#303F9F']}
                style={styles.quickActionGradient}
              >
                <MaterialCommunityIcons name="cog" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Overview */}
        <View style={styles.teamSection}>
          <Text style={styles.sectionTitle}>Team Overview</Text>
          <Surface style={styles.teamCard} elevation={2}>
            <View style={styles.teamHeader}>
              <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
              <Text style={styles.teamTitle}>Sales Representatives</Text>
            </View>
            <Text style={styles.teamSubtitle}>
              Manage your team members, view their performance, and assign routes
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SalesReps')}
              style={styles.viewTeamButton}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewTeamGradient}
              >
                <Text style={styles.viewTeamText}>View All Reps</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Surface>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeSection: {
    flex: 1,
  },
  greeting: {
    color: '#FFF',
    fontSize: 15,
    opacity: 0.95,
    marginBottom: 4,
  },
  userName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  quickActionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionGradient: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  teamSection: {
    paddingHorizontal: 16,
  },
  teamCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  teamSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewTeamButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewTeamGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  viewTeamText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModernDashboardScreen;
