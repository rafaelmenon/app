import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { companySettingsService } from '../services/companySettings';
import type { CompanySettings } from '../services/companySettings';
import type { Ticket } from '../types';

interface CloseTicketModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (sendClosingMessage: boolean, sendRatingMessage: boolean) => void;
  ticket: Ticket | null;
  loading?: boolean;
}

export function CloseTicketModal({
  visible,
  onClose,
  onConfirm,
  ticket,
  loading = false,
}: CloseTicketModalProps) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [sendClosingMessage, setSendClosingMessage] = useState(false);
  const [sendRatingMessage, setSendRatingMessage] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (visible) {
      setSendClosingMessage(false);
      setSendRatingMessage(false);
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await companySettingsService.getSettings();
      setCompanySettings(settings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Verificar se deve mostrar checkbox de mensagem de encerramento
  const showClosingOption =
    companySettings?.enableClosingMessage && !ticket?.contact?.disableClosingMessage;

  // Verificar se deve mostrar checkbox de mensagem de avaliação
  const showRatingOption =
    ticket?.connection?.enableRatingMessage && companySettings?.askBeforeSendingRating;

  const handleConfirm = () => {
    // Se o checkbox de avaliação NÃO está visível (askBeforeSendingRating = false),
    // enviar automaticamente se enableRatingMessage estiver ativo na conexão
    const autoSendRating =
      !companySettings?.askBeforeSendingRating && ticket?.connection?.enableRatingMessage;

    onConfirm(sendClosingMessage, autoSendRating || sendRatingMessage);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Fechar Ticket</Text>
            <Text style={styles.subtitle}>Esta acao nao pode ser desfeita</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.message}>
              Tem certeza que deseja fechar este ticket? O ticket sera movido para a aba "Fechados".
            </Text>

            {loadingSettings ? (
              <ActivityIndicator size="small" color="#8b5cf6" style={styles.settingsLoading} />
            ) : (
              <>
                {/* Opção de enviar mensagem de encerramento */}
                {showClosingOption && (
                  <View style={styles.optionRow}>
                    <Text style={styles.optionText}>
                      Enviar mensagem de encerramento para o cliente
                    </Text>
                    <Switch
                      value={sendClosingMessage}
                      onValueChange={setSendClosingMessage}
                      trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                      thumbColor={sendClosingMessage ? '#ffffff' : '#f4f3f4'}
                    />
                  </View>
                )}

                {/* Opção de enviar mensagem de avaliação */}
                {showRatingOption && (
                  <View style={styles.optionRow}>
                    <Text style={styles.optionText}>
                      Enviar mensagem de avaliacao para o cliente
                    </Text>
                    <Switch
                      value={sendRatingMessage}
                      onValueChange={setSendRatingMessage}
                      trackColor={{ false: '#d1d5db', true: '#16a34a' }}
                      thumbColor={sendRatingMessage ? '#ffffff' : '#f4f3f4'}
                    />
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={loading || loadingSettings}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>Fechar Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  settingsLoading: {
    marginVertical: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginRight: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
