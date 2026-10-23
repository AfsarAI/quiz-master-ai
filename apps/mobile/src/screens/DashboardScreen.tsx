import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { mobileApi } from "../services/api";
import type { Quiz, AnalyticsSummary } from "@quiz-master/shared-types";

export const DashboardScreen = ({ navigation }: any) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [qList, sum] = await Promise.all([
        mobileApi.listQuizzes(),
        mobileApi.getAnalytics().catch(() => null),
      ]);
      setQuizzes(qList);
      if (sum) setAnalytics(sum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Assessments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Analytics Metric Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Assessments</Text>
          <Text style={styles.statVal}>{analytics?.total_quizzes_taken || 0}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Avg Score</Text>
          <Text style={[styles.statVal, { color: "#10b981" }]}>
            {analytics?.average_score_percentage ? `${analytics.average_score_percentage}%` : "—"}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Weak Spots</Text>
          <Text style={[styles.statVal, { color: "#f43f5e" }]}>
            {analytics?.weak_areas?.length || 0}
          </Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Available Quizzes</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Documents")}>
          <Text style={styles.docLink}>View Docs</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={quizzes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No quizzes available right now.</Text>
            <Text style={styles.emptySubtext}>Upload documents via the web hub to generate quizzes.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.quizCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.subjectText}>{item.subject}</Text>
              <View style={styles.diffPill}>
                <Text style={styles.diffText}>{item.difficulty}</Text>
              </View>
            </View>

            <Text style={styles.quizTitle}>{item.title}</Text>
            <Text style={styles.metaText}>
              ⏱ {item.duration_minutes} Mins • 📝 {item.total_questions || item.questions?.length || 0} Questions
            </Text>

            <TouchableOpacity
              style={styles.takeBtn}
              onPress={() => navigation.navigate("Exam", { quizId: item.id })}
            >
              <Text style={styles.takeBtnText}>Enter Examination</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
    padding: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#090d16",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  docLink: {
    fontSize: 13,
    color: "#6366f1",
    fontWeight: "bold",
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  quizCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#6366f1",
    textTransform: "uppercase",
  },
  diffPill: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  diffText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#a5b4fc",
    textTransform: "capitalize",
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 14,
  },
  takeBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  takeBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  emptySubtext: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
  },
});
