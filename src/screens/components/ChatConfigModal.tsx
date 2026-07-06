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
      <TouchableOpacity
        style={styles.configModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.configModalContainer}>
          <Text style={styles.configModalTitle}>Configurações</Text>

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

          <TouchableOpacity
            style={styles.configModalClose}
            onPress={onClose}
          >
            <Text style={styles.configModalCloseText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
  },
  configModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  configModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  configModalClose: {
    marginTop: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  configModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
});
