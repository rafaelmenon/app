import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api";

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Erro no interceptor de request:", error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error("Erro na resposta:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      // Limpar token e redirecionar para login
      await AsyncStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

export default api;
