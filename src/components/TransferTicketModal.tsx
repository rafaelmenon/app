import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../services/users';
import { queuesService } from '../services/queues';
import { ticketsService } from '../services/tickets';
import type { User, Queue, Ticket } from '../types';

interface TransferTicketModalProps {
  visible: boolean;
  onClose: () => void;
  ticket: Ticket;
  onTransferSuccess: () => void;
}

export function TransferTicketModal({
  visible,
  onClose,
  ticket,
  onTransferSuccess,
}: TransferTicketModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [observation, setObservation] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingQueues, setLoadingQueues] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [queueSearchTerm, setQueueSearchTerm] = useState('');

  useEffect(() => {
    if (visible && user?.companyId) {
      loadUsers();
      loadQueues();
    }
  }, [visible, user?.companyId]);

  useEffect(() => {
    if (visible && selectedUserId) {
      loadQueues();
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    if (!user?.companyId) return;
    setLoadingUsers(true);
    try {
      const usersData = await usersService.getByCompanyId(user.companyId);
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar a lista de usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadQueues = async () => {
    setLoadingQueues(true);
    try {
      let queuesData;
      if (selectedUserId) {
        queuesData = await queuesService.getByUserId(selectedUserId);
      } else {
        queuesData = await queuesService.list();
      }
      setQueues(queuesData);
    } catch (error) {
      console.error('Erro ao carregar filas:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar a lista de filas');
    } finally {
      setLoadingQueues(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedQueueId) {
      Alert.alert('Atencao', 'Selecione uma fila para transferir o ticket');
      return;
    }

    setTransferring(true);
    try {
      const transferData: {
        userId?: string | null;
        queueId?: string | null;
        observation?: string;
      } = {};

      if (selectedUserId && selectedUserId.trim() !== '') {
        transferData.userId = selectedUserId;
      } else if (selectedQueueId && selectedQueueId.trim() !== '') {
        transferData.userId = null;
      }

      if (selectedQueueId && selectedQueueId.trim() !== '') {
        transferData.queueId = selectedQueueId;
      }

      if (observation && observation.trim() !== '') {
        transferData.observation = observation.trim();
      }

      await ticketsService.transferTicket(ticket.id, transferData);

      Alert.alert('Sucesso', 'Ticket transferido com sucesso!');
      handleClose();
      onTransferSuccess();
    } catch (error) {
      console.error('Erro ao transferir ticket:', error);
      Alert.alert('Erro', 'Nao foi possivel transferir o ticket. Tente novamente.');
    } finally {
      setTransferring(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setSelectedQueueId('');
    setObservation('');
    setUserSearchTerm('');
    setQueueSearchTerm('');
    onClose();
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUserId === userId) {
      setSelectedUserId('');
    } else {
      setSelectedUserId(userId);
    }
    setSelectedQueueId('');
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredQueues = queues.filter((q) =>
    q.name.toLowerCase().includes(queueSearchTerm.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedQueue = queues.find((q) => q.id === selectedQueueId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Transferir Ticket</Text>
            <TouchableOpacity onPress={handleClose} disabled={transferring}>
              <Text style={styles.closeButton}>X</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Selecione uma fila (obrigatorio) e opcionalmente um usuario
          </Text>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Secao de Usuario */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Usuario de destino (opcional)</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuario..."
                value={userSearchTerm}
                onChangeText={setUserSearchTerm}
                editable={!transferring}
              />
              {loadingUsers ? (
                <ActivityIndicator size="small" color="#8b5cf6" style={styles.loader} />
              ) : (
                <ScrollView
                  style={styles.listContainer}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {filteredUsers.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum usuario encontrado</Text>
                  ) : (
                    filteredUsers.map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={[
                          styles.listItem,
                          selectedUserId === u.id && styles.listItemSelected,
                        ]}
                        onPress={() => handleSelectUser(u.id)}
                        disabled={transferring}
                      >
                        <View style={styles.listItemContent}>
                          <Text
                            style={[
                              styles.listItemTitle,
                              selectedUserId === u.id && styles.listItemTitleSelected,
                            ]}
                          >
                            {u.name}
                          </Text>
                          <Text style={styles.listItemSubtitle}>{u.email}</Text>
                          <Text style={styles.listItemType}>
                            {u.type === 'ADMIN'
                              ? 'Administrador'
                              : u.type === 'SUPER'
                              ? 'Super Admin'
                              : u.type === 'SUPERVISOR'
                              ? 'Supervisor'
                              : 'Usuario'}
                          </Text>
                        </View>
                        {selectedUserId === u.id && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}
              {selectedUser && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>Selecionado: </Text>
                  <Text style={styles.selectedValue}>{selectedUser.name}</Text>
                </View>
              )}
            </View>

            {/* Secao de Fila */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Fila de destino (obrigatorio) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.searchInput}
                placeholder={
                  selectedUserId
                    ? 'Buscar filas do usuario selecionado'
                    : 'Buscar fila...'
                }
                value={queueSearchTerm}
                onChangeText={setQueueSearchTerm}
                editable={!transferring}
              />
              {loadingQueues ? (
                <ActivityIndicator size="small" color="#8b5cf6" style={styles.loader} />
              ) : (
                <ScrollView
                  style={styles.listContainer}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {filteredQueues.length === 0 ? (
                    <Text style={styles.emptyText}>
                      {selectedUserId
                        ? 'O usuario selecionado nao tem acesso a nenhuma fila'
                        : 'Nenhuma fila encontrada'}
                    </Text>
                  ) : (
                    filteredQueues.map((q) => (
                      <TouchableOpacity
                        key={q.id}
                        style={[
                          styles.listItem,
                          selectedQueueId === q.id && styles.listItemSelected,
                        ]}
                        onPress={() => setSelectedQueueId(q.id)}
                        disabled={transferring}
                      >
                        <View style={styles.listItemContent}>
                          <View style={styles.queueNameContainer}>
                            <View
                              style={[styles.queueColor, { backgroundColor: q.color }]}
                            />
                            <Text
                              style={[
                                styles.listItemTitle,
                                selectedQueueId === q.id && styles.listItemTitleSelected,
                              ]}
                            >
                              {q.name}
                            </Text>
                          </View>
                        </View>
                        {selectedQueueId === q.id && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}
              {selectedQueue && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedLabel}>Selecionado: </Text>
                  <View
                    style={[
                      styles.queueColor,
                      { backgroundColor: selectedQueue.color },
                    ]}
                  />
                  <Text style={styles.selectedValue}>{selectedQueue.name}</Text>
                </View>
              )}
            </View>

            {/* Campo de Observacao */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Observacao (opcional)</Text>
              <TextInput
                style={styles.observationInput}
                placeholder="Adicione uma observacao sobre esta transferencia..."
                value={observation}
                onChangeText={setObservation}
                multiline
                numberOfLines={3}
                editable={!transferring}
              />
              <Text style={styles.observationHint}>
                Esta observacao sera exibida no historico do ticket, mas nao sera
                enviada para o contato.
              </Text>
            </View>
          </ScrollView>

          {/* Botoes */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={transferring}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.transferButton,
                (!selectedQueueId || transferring || loadingUsers || loadingQueues) &&
                  styles.transferButtonDisabled,
              ]}
              onPress={handleTransfer}
              disabled={
                !selectedQueueId || transferring || loadingUsers || loadingQueues
              }
            >
              {transferring ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.transferButtonText}>Transferir</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 20,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  loader: {
    marginVertical: 20,
  },
  listContainer: {
    maxHeight: 150,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  listItemTitleSelected: {
    color: '#7c3aed',
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  listItemType: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  queueNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f3ff',
    borderRadius: 6,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 20,
  },
  observationInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  observationHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  transferButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    minWidth: 100,
    alignItems: 'center',
  },
  transferButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  transferButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
