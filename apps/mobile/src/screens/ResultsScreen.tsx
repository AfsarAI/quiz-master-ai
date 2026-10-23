import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { mobileApi } from "../services/api";
import type { EvaluatedAttemptResponse } from "@quiz-master/shared-types";

export const ResultsScreen = ({ route, navigation }: any) => {
  const { attemptId, resultData } = route.params;
  const [result, setResult] = useState<EvaluatedAttemptResponse | null>(resultData || null);
  const [loading, setLoading] = useState(!resultData);

  useEffect(() => {
    if (!resultData && attemptId) {
      const fetchResults = async () => {
        try {
          const res = await mobileApi.getAttemptResult(attemptId);
          setResult(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    }
  }, [attemptId, resultData]);

  if (loading || !result) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Compiling Scorecard...</Text>
      </View>
    );
  }

  const mins = Math.floor(result.time_spent_seconds / 60);
  const secs = result.time_spent_seconds % 60;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score Header Card */}
      <View style={[styles.scoreCard, result.is_passed ? styles.borderPass : styles.borderFail]}>
        <View style={styles.badgeRow}>
          <View style={[styles.passPill, result.is_passed ? styles.bgPass : styles.bgFail]}>
            <Text style={[styles.passPillText, result.is_passed ? styles.textPass : styles.textFail]}>
              {result.is_passed ? "PASSED" : "NEEDS PRACTICE"}
            </Text>
          </View>
          <Text style={styles.timeSpent}>⏱ {mins}m {secs}s</Text>
        </View>

        <Text style={styles.percentageText}>{result.percentage}%</Text>
        <Text style={styles.scoreDetail}>
          {result.total_score} / {result.max_score} Marks Awarded
        </Text>

        {result.next_recommended_practice && (
          <View style={styles.recomBox}>
            <Text style={styles.recomLabel}>AI Recommendation:</Text>
            <Text style={styles.recomText}>{result.next_recommended_practice}</Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>Question-by-Question Review</Text>

      {/* Review items */}
      {result.question_reviews.map((rev, idx) => (
        <View
          key={rev.question_id}
          style={[styles.revCard, rev.is_correct ? styles.revCardCorrect : styles.revCardIncorrect]}
        >
          <View style={styles.revHeader}>
            <Text style={styles.revNum}>Question {idx + 1}</Text>
            <Text style={[styles.revStatus, rev.is_correct ? styles.textPass : styles.textFail]}>
              {rev.is_correct ? "✓ Correct" : "✗ Incorrect"} ({rev.marks_awarded}/{rev.max_marks} pts)
            </Text>
          </View>

          <Text style={styles.qText}>{rev.question_text}</Text>

          {/* Student vs Correct Options */}
          {rev.question_type !== "short_answer" ? (
            <View style={styles.optionsReviewBox}>
              <Text style={styles.subtext}>
                Selected: <Text style={styles.boldWhite}>{rev.student_selection.join(", ") || "None"}</Text>
              </Text>
              <Text style={styles.subtext}>
                Correct: <Text style={[styles.boldWhite, { color: "#10b981" }]}>{rev.correct_options.join(", ")}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.optionsReviewBox}>
              <Text style={styles.subtext}>Your Answer: {rev.student_text_response || "None"}</Text>
              {rev.ai_feedback && <Text style={styles.aiFeedback}>AI: {rev.ai_feedback}</Text>}
            </View>
          )}

          {/* Explanation */}
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>Rationale:</Text>
            <Text style={styles.explanationText}>{rev.explanation}</Text>
          </View>

          {/* Source Grounding Citation */}
          {rev.citation && rev.citation.quote && (
            <View style={styles.citationBox}>
              <Text style={styles.citationDoc}>
                📖 Source: {rev.citation.source_document} {rev.citation.page_number ? `(p. ${rev.citation.page_number})` : ""}
              </Text>
              <Text style={styles.citationQuote}>"{rev.citation.quote}"</Text>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.navigate("Dashboard")}
      >
        <Text style={styles.doneBtnText}>Return to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  scoreCard: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 20,
    alignItems: "center",
  },
  borderPass: {
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  borderFail: {
    borderColor: "rgba(244, 63, 94, 0.4)",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  passPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bgPass: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  bgFail: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
  },
  passPillText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  textPass: {
    color: "#10b981",
  },
  textFail: {
    color: "#f43f5e",
  },
  timeSpent: {
    color: "#94a3b8",
    fontSize: 12,
  },
  percentageText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#ffffff",
  },
  scoreDetail: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 12,
  },
  recomBox: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    marginTop: 6,
  },
  recomLabel: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  recomText: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  revCard: {
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 14,
  },
  revCardCorrect: {
    borderColor: "rgba(16, 185, 129, 0.25)",
  },
  revCardIncorrect: {
    borderColor: "rgba(244, 63, 94, 0.25)",
  },
  revHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  revNum: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#cbd5e1",
  },
  revStatus: {
    fontSize: 12,
    fontWeight: "bold",
  },
  qText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 10,
    lineHeight: 20,
  },
  optionsReviewBox: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 4,
  },
  subtext: {
    fontSize: 12,
    color: "#94a3b8",
  },
  boldWhite: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  aiFeedback: {
    fontSize: 12,
    color: "#a5b4fc",
    marginTop: 4,
  },
  explanationBox: {
    backgroundColor: "#111827",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  explanationLabel: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: "bold",
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 12,
    color: "#cbd5e1",
    lineHeight: 18,
  },
  citationBox: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
    padding: 8,
    borderRadius: 6,
  },
  citationDoc: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#a5b4fc",
    marginBottom: 2,
  },
  citationQuote: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#94a3b8",
  },
  doneBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
