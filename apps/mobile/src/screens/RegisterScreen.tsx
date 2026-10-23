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

export const RegisterScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "educator">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      await mobileApi.register({
        full_name: fullName,
        email,
        password,
        role,
      });
      navigation.replace("Dashboard");
    } catch (e: any) {
      setError(e.message || "Registration failed.");
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start taking grounded assessments</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Jane Doe"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@example.com"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Min 8 characters"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Select Role</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === "student" && styles.roleBtnActive]}
            onPress={() => setRole("student")}
          >
            <Text style={[styles.roleBtnText, role === "student" && styles.roleBtnTextActive]}>
              Student
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === "educator" && styles.roleBtnActive]}
            onPress={() => setRole("educator")}
          >
            <Text style={[styles.roleBtnText, role === "educator" && styles.roleBtnTextActive]}>
              Educator
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.registerLinkText}>
            Already have an account? <Text style={styles.boldText}>Sign In</Text>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 16,
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
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  roleBtnActive: {
    borderColor: "#6366f1",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  roleBtnText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  roleBtnTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  loginBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  registerLink: {
    marginTop: 16,
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
