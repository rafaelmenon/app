import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function HomeScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <Text className="text-2xl font-bold text-gray-800 mb-4">
        Bem-vindo, {user?.name}!
      </Text>
      <Text className="text-base text-gray-600 mb-2">
        Email: {user?.email}
      </Text>
      <Text className="text-base text-gray-600 mb-6">
        Empresa: {user?.company.name}
      </Text>

      <TouchableOpacity
        onPress={handleLogout}
        className="bg-red-500 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-medium">Sair</Text>
      </TouchableOpacity>
    </View>
  );
}
