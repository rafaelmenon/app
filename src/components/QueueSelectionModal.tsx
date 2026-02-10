import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { queuesService } from '../services/queues';
import type { Queue } from '../types';

interface QueueSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (queueId: string) => void;
  contactName: string;
  mode?: 'accept' | 'reopen';
}

export function QueueSelectionModal({
  visible,
  onClose,
  onConfirm,
  contactName,
  mode = 'accept',
}: QueueSelectionModalProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingQueues, setLoadingQueues] = useState(true);

  useEffect(() => {
    if (visible) {
      loadQueues();
      setSelectedQueueId('');
    }
  }, [visible]);

  const loadQueues = async () => {
    try {
      setLoadingQueues(true);
      const queuesData = await queuesService.getMyQueues();
      const sortedQueues = queuesData.sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
      );
      setQueues(sortedQueues);
    } catch (error) {
      console.error('Erro ao carregar filas:', error);
    } finally {
      setLoadingQueues(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedQueueId) return;

    try {
      setLoading(true);
      await onConfirm(selectedQueueId);
      onClose();
      setSelectedQueueId('');
    } catch (error) {
      console.error('Erro ao processar ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setSelectedQueueId('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {mode === 'accept' ? 'Aceitar Ticket' : 'Reabrir Ticket'}
              </Text>
              <Text style={styles.contactName} numberOfLines={1}>
                Contato: {contactName}
              </Text>
              {!loadingQueues && queues.length > 0 && (
                <Text style={styles.queueCount}>
                  {queues.length} {queues.length === 1 ? 'fila disponivel' : 'filas disponiveis'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.instruction}>
              {mode === 'accept'
                ? 'Selecione uma fila para aceitar este ticket:'
                : 'Selecione uma fila para reabrir este ticket:'}
            </Text>

            {loadingQueues ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#8b5cf6" />
                <Text style={styles.loadingText}>Carregando filas...</Text>
              </View>
            ) : queues.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma fila disponivel</Text>
            ) : (
              <FlatList
                data={queues}
                keyExtractor={(item) => item.id}
                style={styles.queueList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.queueItem,
                      selectedQueueId === item.id && styles.queueItemSelected,
                    ]}
                    onPress={() => setSelectedQueueId(item.id)}
                  >
                    <View style={[styles.queueColor, { backgroundColor: item.color }]} />
                    <Text
                      style={[
                        styles.queueName,
                        selectedQueueId === item.id && styles.queueNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {selectedQueueId === item.id && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedQueueId || loading || loadingQueues) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedQueueId || loading || loadingQueues}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {mode === 'accept' ? 'Aceitar Ticket' : 'Reabrir Ticket'}
                </Text>
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
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  contactName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  queueCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  content: {
    padding: 16,
    flexShrink: 1,
  },
  instruction: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
  queueList: {
    maxHeight: 300,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    gap: 10,
  },
  queueItemSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  queueColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  queueName: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  queueNameSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  checkMark: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '700',
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
    backgroundColor: '#16a34a',
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
