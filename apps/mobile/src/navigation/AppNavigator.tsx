import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ExamScreen } from "../screens/ExamScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { DocumentsScreen } from "../screens/DocumentsScreen";

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0f172a",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          contentStyle: {
            backgroundColor: "#090d16",
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Create Account" }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: "Quiz-Master-AI", headerBackVisible: false }}
        />
        <Stack.Screen
          name="Exam"
          component={ExamScreen}
          options={{ title: "Assessment Portal", headerBackVisible: false }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{ title: "Exam Scorecard", headerBackVisible: false }}
        />
        <Stack.Screen
          name="Documents"
          component={DocumentsScreen}
          options={{ title: "Document Library" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
