import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { mobileApi } from "../services/api";
import type { Document } from "@quiz-master/shared-types";

export const DocumentsScreen = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocs = async () => {
    try {
      const docs = await mobileApi.listDocuments();
      setDocuments(docs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocs();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Documents...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Educational Documents</Text>
      <Text style={styles.subheader}>Materials ingested and vectorized with pgvector</Text>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
            <Text style={styles.emptySub}>Upload PDFs or notes via the web portal.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.docTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusPill, item.status === "READY" ? styles.bgReady : styles.bgProcessing]}>
                <Text style={[styles.statusText, item.status === "READY" ? styles.textReady : styles.textProcessing]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>📄 {item.page_count} pages</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>🧩 {item.chunk_count} chunks</Text>
            </View>
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
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subheader: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
    marginRight: 10,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bgReady: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  bgProcessing: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  textReady: {
    color: "#10b981",
  },
  textProcessing: {
    color: "#a5b4fc",
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
  },
  empty: {
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptySub: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
});
