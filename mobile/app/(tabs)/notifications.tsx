import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['mobile-notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] }),
  });

  const unread = (notifications || []).filter((n: any) => !n.read).length;

  return (
    <View style={styles.container}>
      {unread > 0 && (
        <TouchableOpacity style={styles.markAll} onPress={() => markAllMutation.mutate()}>
          <Text style={styles.markAllText}>Mark all as read ({unread})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications || []}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#2563eb" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.unread]}
            onPress={() => !item.read && markReadMutation.mutate(item.id)}
          >
            <View style={[styles.dot, { backgroundColor: item.read ? '#d1d5db' : '#3b82f6' }]} />
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  markAll: { margin: 16, backgroundColor: '#eff6ff', borderRadius: 10, padding: 12, alignItems: 'center' },
  markAllText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 8 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  unread: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827' },
  message: { fontSize: 13, color: '#6b7280', marginTop: 3 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
