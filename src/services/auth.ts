import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";
import type { LoginCredentials, AuthResponse, User } from "../types";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async me(): Promise<User> {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Erro ao fazer logout no servidor:", error);
    } finally {
      await AsyncStorage.removeItem("token");
    }
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem("token");
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem("token", token);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
