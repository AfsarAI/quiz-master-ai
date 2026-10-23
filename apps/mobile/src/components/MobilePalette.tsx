import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import type { Question } from "@quiz-master/shared-types";

interface MobilePaletteProps {
  questions: Question[];
  currentIndex: number;
  visitedSet: Set<string>;
  reviewSet: Set<string>;
  answers: Record<string, { selected_option_ids: string[]; text_response?: string | null }>;
  onSelectIndex: (index: number) => void;
}

export const MobilePalette: React.FC<MobilePaletteProps> = ({
  questions,
  currentIndex,
  visitedSet,
  reviewSet,
  answers,
  onSelectIndex,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Question Navigator</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {questions.map((q, idx) => {
          const isCurrent = currentIndex === idx;
          const isReview = reviewSet.has(q.id);
          const ans = answers[q.id];
          const isAnswered = ans && (ans.selected_option_ids.length > 0 || (ans.text_response && ans.text_response.trim().length > 0));
          const isVisited = visitedSet.has(q.id);

          let badgeStyle: any = styles.notVisited;
          let textStyle: any = styles.textNotVisited;

          if (isCurrent) {
            badgeStyle = styles.current;
            textStyle = styles.textWhite;
          } else if (isReview) {
            badgeStyle = styles.review;
            textStyle = styles.textWhite;
          } else if (isAnswered) {
            badgeStyle = styles.answered;
            textStyle = styles.textWhite;
          } else if (isVisited) {
            badgeStyle = styles.notAnswered;
            textStyle = styles.textWhite;
          }

          return (
            <TouchableOpacity
              key={q.id}
              onPress={() => onSelectIndex(idx)}
              style={[styles.badge, badgeStyle]}
            >
              <Text style={[styles.badgeText, textStyle]}>{idx + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 8,
    alignItems: "center",
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  current: {
    backgroundColor: "#38bdf8",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  answered: {
    backgroundColor: "#10b981",
  },
  review: {
    backgroundColor: "#a855f7",
  },
  notAnswered: {
    backgroundColor: "#f43f5e",
  },
  notVisited: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  textWhite: {
    color: "#ffffff",
  },
  textNotVisited: {
    color: "#94a3b8",
  },
});
