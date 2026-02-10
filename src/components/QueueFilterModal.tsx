import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { Queue } from '../types';

interface QueueFilterModalProps {
  visible: boolean;
  onClose: () => void;
  queues: Queue[];
  selectedQueueIds: string[];
  onQueueToggle: (queueId: string) => void;
  includeNoQueue: boolean;
  onIncludeNoQueueToggle: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  showTicketsWithoutQueue?: boolean;
}

export function QueueFilterModal({
  visible,
  onClose,
  queues,
  selectedQueueIds,
  onQueueToggle,
  includeNoQueue,
  onIncludeNoQueueToggle,
  onSelectAll,
  onDeselectAll,
  showTicketsWithoutQueue = true,
}: QueueFilterModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Filtrar Filas</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={onSelectAll}>
                  <Text style={styles.actionTextPrimary}>Todos</Text>
                </TouchableOpacity>
                <Text style={styles.separator}>|</Text>
                <TouchableOpacity onPress={onDeselectAll}>
                  <Text style={styles.actionTextSecondary}>Nenhum</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de Filas */}
            <ScrollView style={styles.queueList}>
              {queues.map((queue) => (
                <TouchableOpacity
                  key={queue.id}
                  style={styles.queueItem}
                  onPress={() => onQueueToggle(queue.id)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedQueueIds.includes(queue.id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedQueueIds.includes(queue.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <View
                    style={[styles.colorDot, { backgroundColor: queue.color }]}
                  />
                  <Text style={styles.queueName}>{queue.name}</Text>
                </TouchableOpacity>
              ))}

              {/* Opção "Sem Fila" */}
              {showTicketsWithoutQueue && (
                <TouchableOpacity
                  style={[styles.queueItem, styles.noQueueItem]}
                  onPress={onIncludeNoQueueToggle}
                >
                  <View
                    style={[
                      styles.checkbox,
                      includeNoQueue && styles.checkboxChecked,
                    ]}
                  >
                    {includeNoQueue && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={[styles.colorDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.queueName}>Sem Fila</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Footer com contador */}
            <View style={styles.footer}>
              <Text style={styles.counter}>
                {selectedQueueIds.length} de {queues.length} selecionadas
                {includeNoQueue && showTicketsWithoutQueue && ' + Sem Fila'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 350,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionTextPrimary: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionTextSecondary: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  separator: {
    fontSize: 12,
    color: '#9ca3af',
  },
  queueList: {
    maxHeight: 300,
    padding: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  noQueueItem: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  queueName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  counter: {
    fontSize: 12,
    color: '#6b7280',
  },
});
