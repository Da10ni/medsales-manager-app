import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Avatar,
  useTheme,
  FAB,
  Chip,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { fetchSalesReps } from '../redux/slices/salesRepsSlice';
import { fetchRoutes } from '../redux/slices/routesSlice';
import { fetchLocations } from '../redux/slices/locationsSlice';
import { DashboardStats } from '../types';

const DashboardScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const { salesReps } = useSelector((state: RootState) => state.salesReps);
  const { routes } = useSelector((state: RootState) => state.routes);
  const { locations } = useSelector((state: RootState) => state.locations);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = () => {
    if (user) {
      dispatch(fetchSalesReps(user.id));
      dispatch(fetchRoutes(user.id));
      dispatch(fetchLocations(user.id));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate stats
  const stats: DashboardStats = {
    totalSalesReps: salesReps.length,
    activeSalesReps: salesReps.filter(rep => rep.status === 'on-route').length,
    routesAssignedToday: routes.filter(
      route => new Date(route.date).toDateString() === new Date().toDateString()
    ).length,
    completedTasks: routes.filter(route => route.status === 'completed').length,
    pendingTasks: routes.filter(route => route.status === 'assigned' || route.status === 'in-progress').length,
    totalLocations: locations.length,
    routesInProgress: routes.filter(route => route.status === 'in-progress').length,
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statCardContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Avatar.Icon size={40} icon={icon} style={{ backgroundColor: color }} />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const QuickActionButton = ({ icon, label, onPress, color }: any) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Avatar.Icon size={56} icon={icon} style={{ backgroundColor: color }} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Title style={styles.userName}>{user?.name}</Title>
        </View>
        <Avatar.Text
          size={50}
          label={user?.name.substring(0, 2).toUpperCase() || 'MG'}
          style={{ backgroundColor: theme.colors.secondary }}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Total Reps"
              value={stats.totalSalesReps}
              icon="account-group"
              color="#2196F3"
            />
            <StatCard
              title="Active Now"
              value={stats.activeSalesReps}
              icon="account-check"
              color="#4CAF50"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Today's Routes"
              value={stats.routesAssignedToday}
              icon="map-marker-path"
              color="#FF9800"
            />
            <StatCard
              title="In Progress"
              value={stats.routesInProgress}
              icon="clock-outline"
              color="#9C27B0"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Completed"
              value={stats.completedTasks}
              icon="check-circle"
              color="#4CAF50"
            />
            <StatCard
              title="Locations"
              value={stats.totalLocations}
              icon="hospital-building"
              color="#F44336"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Quick Actions</Title>
            <View style={styles.quickActionsContainer}>
              <QuickActionButton
                icon="map-marker-plus"
                label="Assign Route"
                color="#2196F3"
                onPress={() => navigation.navigate('AssignRoute')}
              />
              <QuickActionButton
                icon="account-plus"
                label="Add Rep"
                color="#4CAF50"
                onPress={() => navigation.navigate('AddSalesRep')}
              />
              <QuickActionButton
                icon="hospital-marker"
                label="Add Location"
                color="#FF9800"
                onPress={() => navigation.navigate('AddLocation')}
              />
              <QuickActionButton
                icon="map-search"
                label="Live Track"
                color="#9C27B0"
                onPress={() => navigation.navigate('LiveTracking')}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Active Routes */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Active Routes Today</Title>
            {routes.filter(r => r.status === 'in-progress').length > 0 ? (
              routes
                .filter(r => r.status === 'in-progress')
                .slice(0, 3)
                .map(route => (
                  <TouchableOpacity
                    key={route.id}
                    style={styles.routeItem}
                    onPress={() => navigation.navigate('RouteDetails', { routeId: route.id })}
                  >
                    <Avatar.Icon
                      size={40}
                      icon="map-marker-path"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeName}>{route.routeName}</Text>
                      <Text style={styles.routeDetails}>
                        {route.locations.length} locations • {route.totalDistance}
                      </Text>
                    </View>
                    <Chip mode="outlined" style={styles.statusChip}>
                      In Progress
                    </Chip>
                  </TouchableOpacity>
                ))
            ) : (
              <Text style={styles.emptyText}>No active routes</Text>
            )}
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Recent Activity</Title>
            <Text style={styles.emptyText}>Activity feed coming soon...</Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  greeting: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionLabel: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  routeDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
});

export default DashboardScreen;
