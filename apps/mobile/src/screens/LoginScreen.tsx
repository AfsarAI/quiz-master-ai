import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { mobileApi } from "../services/api";

export const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState("student@example.com");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await mobileApi.login({ email, password });
      navigation.replace("Dashboard");
    } catch (e: any) {
      setError(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>Enterprise RAG Assessment</Text>
        </View>

        <Text style={styles.title}>Quiz-Master-AI</Text>
        <Text style={styles.subtitle}>Sign in to access your grounded quizzes</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#64748b"
        />

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerLinkText}>
            Need an account? <Text style={styles.boldText}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  badgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.3)",
    marginBottom: 12,
  },
  badgeText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "bold",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 20,
  },
  errorText: {
    color: "#f43f5e",
    fontSize: 12,
    marginBottom: 12,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    padding: 10,
    borderRadius: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#cbd5e1",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 14,
  },
  loginBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  loginBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  registerLink: {
    marginTop: 18,
    alignItems: "center",
  },
  registerLinkText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  boldText: {
    color: "#6366f1",
    fontWeight: "bold",
  },
});
