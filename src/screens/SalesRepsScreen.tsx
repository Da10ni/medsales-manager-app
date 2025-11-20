import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Text,
  Avatar,
  Chip,
  FAB,
  Searchbar,
  Menu,
  IconButton,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../redux/store';
import { fetchSalesReps } from '../redux/slices/salesRepsSlice';
import { SalesRep } from '../types';

const SalesRepsScreen = ({ navigation }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { salesReps, loading } = useSelector((state: RootState) => state.salesReps);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (user) {
      dispatch(fetchSalesReps(user.id));
    }
  }, [user]);

  const onRefresh = () => {
    if (user) {
      dispatch(fetchSalesReps(user.id));
    }
  };

  const filteredReps = salesReps.filter((rep) => {
    const matchesSearch =
      rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.phone.includes(searchQuery);

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && rep.isActive) ||
      (filterStatus === 'on-route' && rep.status === 'on-route') ||
      (filterStatus === 'available' && rep.status === 'available');

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-route':
        return '#4CAF50';
      case 'available':
        return '#2196F3';
      case 'on-break':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on-route':
        return 'On Route';
      case 'available':
        return 'Available';
      case 'on-break':
        return 'On Break';
      default:
        return 'Offline';
    }
  };

  const openMenu = (id: string) => {
    setMenuVisible({ ...menuVisible, [id]: true });
  };

  const closeMenu = (id: string) => {
    setMenuVisible({ ...menuVisible, [id]: false });
  };

  const renderSalesRep = ({ item }: { item: SalesRep }) => (
    <Card style={styles.repCard}>
      <TouchableOpacity
        onPress={() => {
          // TODO: Add SalesRepDetails screen
          console.log('View details for:', item.name);
        }}
      >
        <Card.Content>
          <View style={styles.repHeader}>
            <Avatar.Text
              size={50}
              label={item.name.substring(0, 2).toUpperCase()}
              style={{ backgroundColor: getStatusColor(item.status) }}
            />
            <View style={styles.repInfo}>
              <View style={styles.repTitleRow}>
                <Title style={styles.repName}>{item.name}</Title>
                <Menu
                  visible={menuVisible[item.id] || false}
                  onDismiss={() => closeMenu(item.id)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={20}
                      onPress={() => openMenu(item.id)}
                    />
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      closeMenu(item.id);
                      navigation.navigate('AssignRoute', { salesRepId: item.id });
                    }}
                    title="Assign Route"
                    leadingIcon="map-marker-plus"
                  />
                  <Menu.Item
                    onPress={() => {
                      closeMenu(item.id);
                      // TODO: Add EditSalesRep screen
                      console.log('Edit sales rep:', item.name);
                    }}
                    title="Edit"
                    leadingIcon="pencil"
                  />
                  <Menu.Item
                    onPress={() => {
                      closeMenu(item.id);
                      // Handle deactivate
                    }}
                    title="Deactivate"
                    leadingIcon="account-off"
                  />
                </Menu>
              </View>
              <Text style={styles.repContact}>{item.email}</Text>
              <Text style={styles.repContact}>{item.phone}</Text>
            </View>
          </View>

          <View style={styles.repStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.completedRoutes}</Text>
              <Text style={styles.statLabel}>Routes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.totalVisits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.totalDistance.toFixed(0)} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.repFooter}>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {getStatusLabel(item.status)}
            </Chip>
            {item.currentRoute && (
              <Chip mode="outlined" icon="map-marker">
                Active Route
              </Chip>
            )}
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search sales reps..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.filterContainer}>
        <Chip
          selected={filterStatus === 'all'}
          onPress={() => setFilterStatus('all')}
          style={styles.filterChip}
        >
          All ({salesReps.length})
        </Chip>
        <Chip
          selected={filterStatus === 'on-route'}
          onPress={() => setFilterStatus('on-route')}
          style={styles.filterChip}
        >
          On Route ({salesReps.filter(r => r.status === 'on-route').length})
        </Chip>
        <Chip
          selected={filterStatus === 'available'}
          onPress={() => setFilterStatus('available')}
          style={styles.filterChip}
        >
          Available ({salesReps.filter(r => r.status === 'available').length})
        </Chip>
      </View>

      <FlatList
        data={filteredReps}
        renderItem={renderSalesRep}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Avatar.Icon size={80} icon="account-off" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No sales representatives found</Text>
            <Text style={styles.emptySubtext}>Add your first sales rep to get started</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          // TODO: Add AddSalesRep screen
          console.log('Add new sales rep');
        }}
        label="Add Rep"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  repCard: {
    marginBottom: 16,
  },
  repHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  repInfo: {
    flex: 1,
    marginLeft: 12,
  },
  repTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repName: {
    fontSize: 18,
    marginBottom: 4,
  },
  repContact: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  repStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  repFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    height: 28,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    backgroundColor: '#eee',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default SalesRepsScreen;
