import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  TouchableOpacity, Pressable, Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { SkeletonCard, SkeletonStatCard } from '../../components/Skeleton';
import { BottomSheet } from '../../components/BottomSheet';

const STAT_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Students: { bg: '#ede9fe', text: '#7c3aed', accent: '#7c3aed' },
  Teachers:  { bg: '#dbeafe', text: '#2563eb', accent: '#2563eb' },
  Present:   { bg: '#dcfce7', text: '#16a34a', accent: '#16a34a' },
  Absent:    { bg: '#fee2e2', text: '#dc2626', accent: '#dc2626' },
};

function StatCard({ label, value, color }: { label: string; value: string | number; color: { bg: string; text: string; accent: string } }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color.bg }]}>
      <Text style={[styles.statValue, { color: color.accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color.text }]}>{label}</Text>
    </View>
  );
}

function ExamBadge({ daysUntil }: { daysUntil: number }) {
  const urgent = daysUntil <= 3;
  const soon = daysUntil <= 7;
  const bg = urgent ? '#fee2e2' : soon ? '#fef3c7' : '#f3f4f6';
  const text = urgent ? '#dc2626' : soon ? '#d97706' : '#6b7280';
  const label = daysUntil <= 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`;
  return (
    <View style={[styles.examBadge, { backgroundColor: bg }]}>
      <Text style={[styles.examBadgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data.data),
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data.data),
  });

  const statItems = [
    { label: 'Students', value: stats?.totalStudents ?? '—' },
    { label: 'Teachers', value: stats?.totalTeachers ?? '—' },
    { label: 'Present',  value: stats?.attendanceToday?.present ?? '—' },
    { label: 'Absent',   value: stats?.attendanceToday?.absent ?? '—' },
  ];

  const attTotal = (stats?.attendanceToday?.present || 0) + (stats?.attendanceToday?.absent || 0) +
    (stats?.attendanceToday?.late || 0) + (stats?.attendanceToday?.excused || 0);
  const attPct = attTotal ? Math.round((stats?.attendanceToday?.present / attTotal) * 100) : 0;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <View style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroLeft}>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.heroName} numberOfLines={1}>{user?.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role}</Text>
              </View>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            </View>
          </View>

          {/* Attendance bar */}
          {!isLoading && attTotal > 0 && (
            <View style={styles.attBar}>
              <View style={styles.attBarLabels}>
                <Text style={styles.attBarLabel}>Today&apos;s Attendance</Text>
                <Text style={styles.attBarPct}>{attPct}%</Text>
              </View>
              <View style={styles.attTrack}>
                <View style={[styles.attFill, { width: `${attPct}%` as any }]} />
              </View>
            </View>
          )}
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading ? (
          <View style={styles.statsGrid}>
            {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statItems.map(s => (
              <StatCard key={s.label} label={s.label} value={s.value} color={STAT_COLORS[s.label]} />
            ))}
          </View>
        )}

        {/* Pinned announcements */}
        {((announcements || []).filter((a: any) => a.pinned).length > 0) && (
          <>
            <Text style={styles.sectionTitle}>📌 Pinned Notices</Text>
            {announcements!.filter((a: any) => a.pinned).map((a: any) => (
              <View key={a.id} style={styles.pinnedCard}>
                <View style={styles.pinnedAccent} />
                <View style={styles.pinnedContent}>
                  <Text style={styles.pinnedTitle}>{a.title}</Text>
                  <Text style={styles.pinnedBody} numberOfLines={3}>{a.content}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Upcoming exams */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Exams</Text>
        </View>
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (stats?.recentExams || []).length > 0 ? (
          stats!.recentExams.map((exam: any) => {
            const d = new Date(exam.examDate);
            const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
            return (
              <Pressable
                key={exam.id}
                style={({ pressed }) => [styles.examCard, pressed && styles.examCardPressed]}
                onPress={() => setSelectedExam(exam)}
              >
                <View style={styles.examDate}>
                  <Text style={styles.examDay}>{d.getDate()}</Text>
                  <Text style={styles.examMonth}>{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</Text>
                </View>
                <View style={styles.examInfo}>
                  <Text style={styles.examTitle} numberOfLines={1}>{exam.title}</Text>
                  <Text style={styles.examSub}>{exam.subject?.name} · {exam.class?.name}</Text>
                </View>
                <ExamBadge daysUntil={daysUntil} />
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming exams</Text>
          </View>
        )}
      </ScrollView>

      {/* Exam detail bottom sheet */}
      <BottomSheet visible={!!selectedExam} onClose={() => setSelectedExam(null)} snapHeight={320}>
        {selectedExam && (
          <View>
            <Text style={styles.sheetTitle}>{selectedExam.title}</Text>
            <Text style={styles.sheetSub}>{selectedExam.subject?.name} · {selectedExam.class?.name}</Text>
            <View style={styles.sheetDivider} />
            <View style={styles.sheetRow}>
              <Text style={styles.sheetKey}>Date</Text>
              <Text style={styles.sheetVal}>{new Date(selectedExam.examDate).toLocaleDateString('en', { dateStyle: 'long' })}</Text>
            </View>
            {selectedExam.duration && (
              <View style={styles.sheetRow}>
                <Text style={styles.sheetKey}>Duration</Text>
                <Text style={styles.sheetVal}>{selectedExam.duration} min</Text>
              </View>
            )}
            {selectedExam.totalMarks && (
              <View style={styles.sheetRow}>
                <Text style={styles.sheetKey}>Total Marks</Text>
                <Text style={styles.sheetVal}>{selectedExam.totalMarks}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.sheetBtn} onPress={() => setSelectedExam(null)}>
              <Text style={styles.sheetBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  hero: {
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLeft: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  roleText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },

  attBar: { marginTop: 16 },
  attBarLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  attBarLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  attBarPct: { color: '#fff', fontSize: 12, fontWeight: '700' },
  attTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  attFill: { height: 6, backgroundColor: '#a5f3fc', borderRadius: 3 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginTop: 22, marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { borderRadius: 16, padding: 16, flex: 1, minWidth: '45%' },
  statValue: { fontSize: 30, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4, fontWeight: '500' },

  pinnedCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  pinnedAccent: { width: 4, backgroundColor: '#f59e0b' },
  pinnedContent: { flex: 1, padding: 14 },
  pinnedTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  pinnedBody: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },

  examCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  examCardPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  examDate: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  examDay: { fontSize: 16, fontWeight: '800', color: '#6366f1' },
  examMonth: { fontSize: 9, color: '#818cf8', letterSpacing: 0.5, fontWeight: '600' },
  examInfo: { flex: 1, minWidth: 0 },
  examTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  examSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  examBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  examBadgeText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  // Bottom sheet styles
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sheetSub: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  sheetDivider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 16 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  sheetKey: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  sheetVal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  sheetBtn: { marginTop: 20, backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
