import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ConfigModalProps {
  visible: boolean;
  onClose: () => void;
  signatureEnabled: boolean;
  onSignatureToggle: (enabled: boolean) => void;
  whisperMode: boolean;
  onWhisperToggle: (value: boolean) => void;
  user: { name: string; type: string } | null;
}

export function ChatConfigModal({
  visible,
  onClose,
  signatureEnabled,
  onSignatureToggle,
  whisperMode,
  onWhisperToggle,
  user,
}: ConfigModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.configModalOverlay}>
        <View style={styles.configModalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Configurações</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.configModalRow}>
            <Text style={styles.configModalLabel}>Assinar</Text>
            {signatureEnabled && user && (
              <Text style={styles.configModalPreview}>
                <Text style={styles.configModalPreviewBold}>{user.name}:</Text>
              </Text>
            )}
            <Switch
              value={signatureEnabled}
              onValueChange={onSignatureToggle}
              disabled={user?.type === 'USER'}
              trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
              thumbColor={signatureEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.configModalRow}>
            <Text style={styles.configModalLabel}>Modo sussurro</Text>
            <Switch
              value={whisperMode}
              onValueChange={onWhisperToggle}
              trackColor={{ false: '#d1d5db', true: '#8b5cf6' }}
              thumbColor={whisperMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  configModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  configModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  configModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 10,
  },
  configModalLabel: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  configModalPreview: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  configModalPreviewBold: {
    fontWeight: '700',
    color: '#6b7280',
  },
});
