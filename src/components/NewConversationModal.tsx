import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { contactsService } from '../services/contacts';
import { connectionsService } from '../services/connections';
import { companySettingsService } from '../services/companySettings';
import { queuesService } from '../services/queues';
import type { Contact } from '../services/contacts';
import type { WhatsAppConnection } from '../services/connections';
import type { CompanySettings } from '../services/companySettings';
import type { Queue } from '../types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface NewConversationModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateConversation: (contactId: string, queueId: string, connectionId: string) => void;
}

type Step = 'contact' | 'settings';

export function NewConversationModal({
  visible,
  onClose,
  onCreateConversation,
}: NewConversationModalProps) {
  const [step, setStep] = useState<Step>('contact');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactCountryCode, setNewContactCountryCode] = useState('55');

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('contact');
      setSelectedContact(null);
      setSelectedQueueId('');
      setSelectedConnectionId('');
      setSearchTerm('');
      setContacts([]);
      setShowAddContact(false);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactCountryCode('55');
      loadInitialData();
    }
  }, [visible]);

  // Debounce para busca de contatos quando digita
  useEffect(() => {
    if (!visible || step !== 'contact') return;
    if (searchTerm === '') return;

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await contactsService.list(searchTerm);
        setContacts(results);
      } catch (error) {
        console.error('Erro ao buscar contatos:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, visible, step]);

  // Auto-selecionar conexão padrão
  useEffect(() => {
    if (companySettings && connections.length > 0 && !companySettings.chooseConnection) {
      const defaultConn = connections.find((c) => c.isDefault) || connections[0];
      if (defaultConn && !selectedConnectionId) {
        setSelectedConnectionId(defaultConn.id);
      }
    }
    if (connections.length === 1 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [companySettings, connections, selectedConnectionId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [queuesData, connectionsData, settings, initialContacts] = await Promise.all([
        queuesService.getMyQueues().catch(() => []),
        connectionsService.list().catch(() => []),
        companySettingsService.getPublicSettings().catch(() => null),
        contactsService.list('').catch(() => []),
      ]);
      setQueues(queuesData || []);
      setConnections(connectionsData || []);
      if (settings) setCompanySettings(settings);
      setContacts(initialContacts || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (text === '') {
      // Recarregar lista completa ao limpar busca
      contactsService.list('').then((results) => setContacts(results)).catch(() => {});
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setStep('settings');
  };

  const handleGoBack = () => {
    setStep('contact');
    setSelectedContact(null);
    setSelectedQueueId('');
  };

  const handleCreateConversation = async () => {
    if (!selectedContact) return;

    if (!selectedQueueId) {
      Alert.alert('Atenção', 'Por favor, selecione uma fila');
      return;
    }

    let connectionIdToUse = selectedConnectionId;

    if (companySettings?.chooseConnection) {
      if (!selectedConnectionId) {
        Alert.alert('Atenção', 'Por favor, selecione uma conexão');
        return;
      }
    } else {
      const defaultConn = connections.find((c) => c.isDefault) || connections[0];
      if (defaultConn) {
        connectionIdToUse = defaultConn.id;
      } else {
        Alert.alert('Erro', 'Nenhuma conexão disponível');
        return;
      }
    }

    try {
      setCreating(true);

      if (selectedContact.id === 'new-contact') {
        const contact = await contactsService.create({
          name: newContactName,
          phone: newContactPhone,
          countryCode: newContactCountryCode,
        });
        onCreateConversation(contact.id, selectedQueueId, connectionIdToUse);
      } else {
        onCreateConversation(selectedContact.id, selectedQueueId, connectionIdToUse);
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        Alert.alert('Erro', 'Este número já está cadastrado. Pesquise pelo nome ou número existente.');
      } else {
        Alert.alert('Erro', error.response?.data?.error || 'Erro ao criar conversa');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleAddNewContactNext = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Atenção', 'Nome e telefone são obrigatórios');
      return;
    }
    setSelectedContact({
      id: 'new-contact',
      name: newContactName,
      phone: newContactPhone,
      countryCode: newContactCountryCode,
      isValidated: false,
    });
    setStep('settings');
  };

  const formatPhone = (countryCode: string, phone: string) => {
    return `+${countryCode} ${phone}`;
  };

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleSelectContact(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactNameRow}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name}
          </Text>
          {!item.isValidated && <View style={styles.notValidatedDot} />}
        </View>
        <Text style={styles.contactPhone}>
          {formatPhone(item.countryCode, item.phone)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Step 1: Seleção de contato
  const renderContactStep = () => (
    <View style={styles.stepContainer}>
      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar contatos por nome ou telefone..."
          placeholderTextColor="#9ca3af"
          value={searchTerm}
          onChangeText={handleSearchChange}
          autoFocus
        />
        {searchLoading && (
          <ActivityIndicator
            size="small"
            color="#6b7280"
            style={styles.searchSpinner}
          />
        )}
      </View>

      {showAddContact ? (
        /* Formulário de novo contato */
        <ScrollView style={styles.formScrollView} keyboardShouldPersistTaps="handled">
          <View style={styles.addContactForm}>
            <Text style={styles.addContactTitle}>Adicionar Novo Contato</Text>
            <Text style={styles.addContactSubtitle}>
              Preencha os dados para criar um novo contato
            </Text>

            <Text style={styles.inputLabel}>Nome *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Nome do contato"
              placeholderTextColor="#9ca3af"
              value={newContactName}
              onChangeText={setNewContactName}
            />

            <Text style={styles.inputLabel}>Telefone *</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countryCodeButton}
                onPress={() => {
                  const codes = ['55', '1', '44', '34', '33'];
                  const idx = codes.indexOf(newContactCountryCode);
                  setNewContactCountryCode(codes[(idx + 1) % codes.length]);
                }}
              >
                <Text style={styles.countryCodeText}>+{newContactCountryCode}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                placeholder="11999999999"
                placeholderTextColor="#9ca3af"
                value={newContactPhone}
                onChangeText={(text) => setNewContactPhone(text.replace(/\D/g, ''))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.addContactButtons}>
              <TouchableOpacity
                style={styles.cancelSmallButton}
                onPress={() => setShowAddContact(false)}
              >
                <Text style={styles.cancelSmallButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (!newContactName.trim() || !newContactPhone.trim()) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleAddNewContactNext}
                disabled={!newContactName.trim() || !newContactPhone.trim()}
              >
                <Text style={styles.nextButtonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Carregando contatos...</Text>
        </View>
      ) : (
        /* Lista de contatos */
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
          style={styles.contactList}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.addContactButton}
              onPress={() => setShowAddContact(true)}
            >
              <View style={styles.addContactIcon}>
                <Text style={styles.addContactIconText}>+</Text>
              </View>
              <Text style={styles.addContactButtonText}>Adicionar novo contato</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            !searchLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchTerm
                    ? 'Nenhum contato encontrado'
                    : 'Nenhum contato disponível'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );

  // Step 2: Configurações (fila e conexão)
  const renderSettingsStep = () => (
    <ScrollView style={styles.stepContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.settingsContent}>
        {/* Contato selecionado */}
        {selectedContact && (
          <View style={styles.selectedContactBanner}>
            <View style={styles.contactAvatar}>
              <Text style={styles.contactAvatarText}>
                {selectedContact.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedContactName}>{selectedContact.name}</Text>
              <Text style={styles.selectedContactPhone}>
                {formatPhone(selectedContact.countryCode, selectedContact.phone)}
              </Text>
            </View>
          </View>
        )}

        {/* Seleção de Fila */}
        <Text style={styles.sectionTitle}>Selecione uma fila *</Text>
        <View style={styles.selectionList}>
          {queues.map((queue) => (
            <TouchableOpacity
              key={queue.id}
              style={[
                styles.selectionItem,
                selectedQueueId === queue.id && styles.selectionItemActive,
              ]}
              onPress={() => setSelectedQueueId(queue.id)}
            >
              <View style={[styles.colorDot, { backgroundColor: queue.color }]} />
              <Text
                style={[
                  styles.selectionItemText,
                  selectedQueueId === queue.id && styles.selectionItemTextActive,
                ]}
              >
                {queue.name}
              </Text>
              {selectedQueueId === queue.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
          {queues.length === 0 && (
            <Text style={styles.noItemsText}>Nenhuma fila disponível</Text>
          )}
        </View>

        {/* Seleção de Conexão (se habilitado) */}
        {companySettings?.chooseConnection && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Selecione uma conexão *
            </Text>
            <View style={styles.selectionList}>
              {connections.map((conn) => (
                <TouchableOpacity
                  key={conn.id}
                  style={[
                    styles.selectionItem,
                    selectedConnectionId === conn.id && styles.selectionItemActive,
                  ]}
                  onPress={() => setSelectedConnectionId(conn.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: conn.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.selectionItemText,
                        selectedConnectionId === conn.id && styles.selectionItemTextActive,
                      ]}
                    >
                      {conn.name}
                    </Text>
                    <Text style={styles.connectionSubtext}>{conn.evolutionName}</Text>
                  </View>
                  {conn.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Padrão</Text>
                    </View>
                  )}
                  {selectedConnectionId === conn.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              {connections.length === 0 && (
                <Text style={styles.noItemsText}>Nenhuma conexão disponível</Text>
              )}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modalWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {step === 'contact' ? 'Nova Conversa' : 'Configurações da Conversa'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {step === 'contact'
                    ? 'Selecione um contato para iniciar'
                    : 'Escolha a fila e conexão'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {step === 'contact' ? renderContactStep() : renderSettingsStep()}

            {/* Footer */}
            <View style={styles.footer}>
              {step === 'settings' ? (
                <>
                  <TouchableOpacity style={styles.footerBackButton} onPress={handleGoBack}>
                    <Text style={styles.footerBackButtonText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      (!selectedQueueId ||
                        (companySettings?.chooseConnection === true && !selectedConnectionId) ||
                        creating) &&
                        styles.buttonDisabled,
                    ]}
                    onPress={handleCreateConversation}
                    disabled={
                      !selectedQueueId ||
                      (companySettings?.chooseConnection === true && !selectedConnectionId) ||
                      creating
                    }
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.createButtonText}>Criar Conversa</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.footerCancelButton} onPress={onClose}>
                  <Text style={styles.footerCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: SCREEN_HEIGHT * 0.8,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  stepContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  searchSpinner: {
    position: 'absolute',
    right: 28,
  },
  contactList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4f46e5',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  notValidatedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 6,
  },
  contactPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f0f9ff',
  },
  addContactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addContactIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  addContactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
  formScrollView: {
    flex: 1,
  },
  addContactForm: {
    padding: 20,
  },
  addContactTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  addContactSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  formInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  addContactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelSmallButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelSmallButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  selectedContactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedContactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  selectedContactPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  settingsContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  selectionList: {
    gap: 8,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  selectionItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  selectionItemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  selectionItemTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    marginLeft: 8,
  },
  connectionSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  noItemsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  footerBackButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  footerBackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  footerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  footerCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
