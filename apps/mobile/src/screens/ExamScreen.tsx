import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { mobileApi } from "../services/api";
import { MobilePalette } from "../components/MobilePalette";
import type { Quiz, Question } from "@quiz-master/shared-types";

export const ExamScreen = ({ route, navigation }: any) => {
  const { quizId } = route.params;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selected_option_ids: string[]; text_response?: string | null }>>({});
  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const [reviewSet, setReviewSet] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 mins default
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const startSession = async () => {
      try {
        const [qData, att] = await Promise.all([
          mobileApi.getQuiz(quizId),
          mobileApi.startAttempt(quizId),
        ]);
        setQuiz(qData);
        setAttemptId(att.attempt_id);

        const exp = new Date(att.expires_at).getTime();
        const diff = Math.max(0, Math.floor((exp - Date.now()) / 1000));
        setSecondsRemaining(diff);

        if (qData.questions && qData.questions.length > 0) {
          setVisitedSet(new Set([qData.questions[0].id]));
        }
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to start assessment.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    startSession();
  }, [quizId]);

  // Countdown Timer
  useEffect(() => {
    if (loading || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, secondsRemaining]);

  const questions = quiz?.questions || [];
  const currentQ: Question | undefined = questions[currentIndex];

  const handleSelectOption = (optId: string) => {
    if (!currentQ) return;
    const existing = answers[currentQ.id] || { selected_option_ids: [] };

    let newSelected: string[];
    if (currentQ.question_type === "multi_choice") {
      newSelected = existing.selected_option_ids.includes(optId)
        ? existing.selected_option_ids.filter((id) => id !== optId)
        : [...existing.selected_option_ids, optId];
    } else {
      newSelected = [optId];
    }

    setAnswers({
      ...answers,
      [currentQ.id]: {
        ...existing,
        selected_option_ids: newSelected,
      },
    });
  };

  const handleSetText = (text: string) => {
    if (!currentQ) return;
    const existing = answers[currentQ.id] || { selected_option_ids: [] };
    setAnswers({
      ...answers,
      [currentQ.id]: {
        ...existing,
        text_response: text,
      },
    });
  };

  const handleToggleReview = () => {
    if (!currentQ) return;
    const next = new Set(reviewSet);
    if (next.has(currentQ.id)) {
      next.delete(currentQ.id);
    } else {
      next.add(currentQ.id);
    }
    setReviewSet(next);
  };

  const handleClear = () => {
    if (!currentQ) return;
    const next = { ...answers };
    delete next[currentQ.id];
    setAnswers(next);
  };

  const navigateTo = (index: number) => {
    if (index >= 0 && index < questions.length) {
      const targetQ = questions[index];
      const nextVisited = new Set(visitedSet);
      nextVisited.add(targetQ.id);
      setVisitedSet(nextVisited);
      setCurrentIndex(index);
    }
  };

  const handleSubmitExam = async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    try {
      const submissionList = questions.map((q) => {
        const a = answers[q.id];
        return {
          question_id: q.id,
          selected_option_ids: a ? a.selected_option_ids : [],
          text_response: a && a.text_response ? a.text_response : null,
        };
      });

      const res = await mobileApi.submitAttempt(attemptId, { answers: submissionList });
      navigation.replace("Results", { attemptId, resultData: res });
    } catch (e: any) {
      Alert.alert("Submission Error", e.message || "Failed to submit assessment.");
      setSubmitting(false);
    }
  };

  const confirmSubmit = () => {
    Alert.alert(
      "Submit Examination",
      "Are you sure you want to finalize and grade your assessment?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit Now", onPress: handleSubmitExam },
      ]
    );
  };

  if (loading || !currentQ) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Securing Exam Portal...</Text>
      </View>
    );
  }

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const currentDraft = answers[currentQ.id] || { selected_option_ids: [] };
  const isMarkedReview = reviewSet.has(currentQ.id);

  return (
    <View style={styles.container}>
      {/* Top Bar with Timer */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.quizSubject}>{quiz?.subject}</Text>
          <Text style={styles.questionCounter}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
        </View>

        <View style={styles.timerBox}>
          <Text style={styles.timerText}>⏱ {timeStr}</Text>
        </View>
      </View>

      {/* Visual Palette */}
      <MobilePalette
        questions={questions}
        currentIndex={currentIndex}
        visitedSet={visitedSet}
        reviewSet={reviewSet}
        answers={answers}
        onSelectIndex={navigateTo}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {/* Question Text */}
        <View style={styles.questionBox}>
          <View style={styles.qMetaRow}>
            <Text style={styles.qTypeBadge}>
              {currentQ.question_type.replace("_", " ").toUpperCase()}
            </Text>
            <Text style={styles.qPoints}>{currentQ.points} Point(s)</Text>
          </View>
          <Text style={styles.questionText}>{currentQ.question_text}</Text>
        </View>

        {/* Options or Text Input */}
        {currentQ.question_type === "short_answer" ? (
          <View style={styles.shortAnswerContainer}>
            <Text style={styles.inputLabel}>Written Response (AI Rubric):</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              value={currentDraft.text_response || ""}
              onChangeText={handleSetText}
              placeholder="Type your response here..."
              placeholderTextColor="#64748b"
            />
          </View>
        ) : (
          <View style={styles.optionsList}>
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = currentDraft.selected_option_ids.includes(opt.id);
              const letter = String.fromCharCode(65 + oIdx);

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optCard, isSelected && styles.optCardSelected]}
                  onPress={() => handleSelectOption(opt.id)}
                >
                  <View style={[styles.letterPill, isSelected && styles.letterPillSelected]}>
                    <Text style={[styles.letterText, isSelected && styles.letterTextSelected]}>
                      {letter}
                    </Text>
                  </View>
                  <Text style={[styles.optText, isSelected && styles.optTextSelected]}>
                    {opt.option_text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.smallBtn, isMarkedReview && styles.smallBtnReview]}
            onPress={handleToggleReview}
          >
            <Text style={[styles.smallBtnText, isMarkedReview && styles.smallBtnTextReview]}>
              {isMarkedReview ? "★ Marked" : "☆ Review"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBtn} onPress={handleClear}>
            <Text style={styles.smallBtnText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.btnDisabled]}
            disabled={currentIndex === 0}
            onPress={() => navigateTo(currentIndex - 1)}
          >
            <Text style={styles.navBtnText}>Prev</Text>
          </TouchableOpacity>

          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity style={styles.navBtnPrimary} onPress={() => navigateTo(currentIndex + 1)}>
              <Text style={styles.navBtnPrimaryText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={confirmSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  quizSubject: {
    fontSize: 11,
    color: "#6366f1",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  timerBox: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
  },
  timerText: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "bold",
  },
  body: {
    padding: 16,
    paddingBottom: 24,
  },
  questionBox: {
    backgroundColor: "#0f172a",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  qMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  qTypeBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#a5b4fc",
  },
  qPoints: {
    fontSize: 11,
    color: "#94a3b8",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 22,
  },
  optionsList: {
    gap: 10,
  },
  optCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optCardSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "#6366f1",
  },
  letterPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  letterPillSelected: {
    backgroundColor: "#6366f1",
  },
  letterText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  letterTextSelected: {
    color: "#ffffff",
  },
  optText: {
    fontSize: 14,
    color: "#cbd5e1",
    flex: 1,
  },
  optTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
  shortAnswerContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  textArea: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    padding: 14,
    color: "#ffffff",
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  footer: {
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    padding: 12,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnReview: {
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderWidth: 1,
    borderColor: "#a855f7",
  },
  smallBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  smallBtnTextReview: {
    color: "#d8b4fe",
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  navBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navBtnPrimaryText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
