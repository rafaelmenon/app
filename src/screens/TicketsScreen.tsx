import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks';
import { ticketsService } from '../services/tickets';
import { queuesService } from '../services/queues';
import { TicketCard, QueueFilterModal, QueueSelectionModal, CloseTicketModal, NewConversationModal } from '../components';
import type { Ticket, TicketStatus, Queue } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type TabType = 'open' | 'pending' | 'closed' | 'groups';

type TicketsScreenProps = NativeStackScreenProps<RootStackParamList, 'Tickets'>;

export function TicketsScreen({ navigation }: TicketsScreenProps) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('open');

  // Tickets separados por aba
  const [ticketsByTab, setTicketsByTab] = useState<Record<TabType, Ticket[]>>({
    open: [],
    pending: [],
    closed: [],
    groups: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Páginas e hasMore por aba
  const [pagesByTab, setPagesByTab] = useState<Record<TabType, number>>({
    open: 1,
    pending: 1,
    closed: 1,
    groups: 1,
  });

  const [hasMoreByTab, setHasMoreByTab] = useState<Record<TabType, boolean>>({
    open: true,
    pending: true,
    closed: true,
    groups: true,
  });

  const [showAll, setShowAll] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Estados para filtro de filas
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [includeNoQueue, setIncludeNoQueue] = useState(true);
  const [queuesLoaded, setQueuesLoaded] = useState(false); // Flag para saber se as filas foram carregadas

  // Refs para manter valores atuais dos filtros (para uso em callbacks)
  const selectedQueueIdsRef = useRef<string[]>([]);
  const queuesRef = useRef<Queue[]>([]);
  const includeNoQueueRef = useRef(true);

  // Atualizar refs quando os estados mudam
  useEffect(() => {
    selectedQueueIdsRef.current = selectedQueueIds;
    queuesRef.current = queues;
    includeNoQueueRef.current = includeNoQueue;
  }, [selectedQueueIds, queues, includeNoQueue]);

  // Função para verificar se um ticket deve ser exibido baseado nos filtros de fila
  const shouldShowTicket = useCallback((ticket: Ticket): boolean => {
    // Grupos sempre são exibidos (filtro de fila não se aplica)
    if (ticket.isGroup) return true;

    const currentSelectedIds = selectedQueueIdsRef.current;
    const currentQueues = queuesRef.current;
    const currentIncludeNoQueue = includeNoQueueRef.current;

    // Se todas as filas estão selecionadas, mostrar todos
    if (currentSelectedIds.length === currentQueues.length && currentQueues.length > 0) {
      // Todas selecionadas - verificar tickets sem fila
      if (!ticket.queueId) {
        return currentIncludeNoQueue;
      }
      return true;
    }

    // Se nenhuma fila está selecionada
    if (currentSelectedIds.length === 0) {
      // Mostrar apenas sem fila se includeNoQueue está ativo
      return !ticket.queueId && currentIncludeNoQueue;
    }

    // Filas específicas selecionadas
    if (ticket.queueId) {
      return currentSelectedIds.includes(ticket.queueId);
    }

    // Ticket sem fila
    return currentIncludeNoQueue;
  }, []);
  const [showQueueFilterModal, setShowQueueFilterModal] = useState(false);
  const [showQueueSelectionModal, setShowQueueSelectionModal] = useState(false);
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<Ticket | null>(null);
  const [closingTicket, setClosingTicket] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [pendingTicket, setPendingTicket] = useState<{
    id: string;
    contactName: string;
    mode: 'accept' | 'reopen';
  } | null>(null);

  const [totalCounts, setTotalCounts] = useState({
    open: 0,
    pending: 0,
    closed: 0,
    groups: 0,
  });

  // Inicializar Socket.IO
  const { on, off } = useSocket({
    userId: user?.id,
    companyId: user?.companyId,
    showAll,
  });

  // Carregar tickets de uma aba específica
  const loadTicketsForTab = async (tab: TabType, page: number, append = false) => {
    try {
      // Para grupos, sempre usar status OPEN
      const status: TicketStatus | undefined =
        tab === 'groups' ? 'OPEN' :
        tab === 'open' ? 'OPEN' :
        tab === 'pending' ? 'PENDING' :
        tab === 'closed' ? 'CLOSED' :
        undefined;

      // isGroup: true para grupos, false para as outras abas (excluir grupos)
      const isGroup = tab === 'groups' ? true : false;

      // Para grupos, showAll sempre true (mostrar todos os grupos da empresa)
      const useShowAll = tab === 'groups' ? true : showAll;

      // Determinar queueIds baseado na seleção:
      // - Todas marcadas (ou nenhuma carregada ainda) → undefined (sem filtro)
      // - Nenhuma marcada explicitamente → [] (apenas sem fila)
      // - Seleção específica → array com IDs
      const queueIdsToSend =
        selectedQueueIds.length === queues.length ||
        (selectedQueueIds.length === 0 && queues.length === 0)
          ? undefined
          : selectedQueueIds.length === 0
          ? []
          : selectedQueueIds;

      const response = await ticketsService.getTickets(
        status,
        page,
        15,
        isGroup,
        useShowAll,
        queueIdsToSend,
        includeNoQueue
      );

      setTicketsByTab((prev) => {
        if (append) {
          const existingIds = new Set(prev[tab].map((t) => t.id));
          const newTickets = response.tickets.filter((t) => !existingIds.has(t.id));
          return { ...prev, [tab]: [...prev[tab], ...newTickets] };
        }
        return { ...prev, [tab]: response.tickets };
      });

      setHasMoreByTab((prev) => ({
        ...prev,
        [tab]: response.hasMore,
      }));

      setTotalCounts((prev) => ({
        ...prev,
        [tab]: response.total,
      }));

      return response;
    } catch (error: any) {
      console.error(`Erro ao carregar tickets da aba ${tab}:`, error);
      throw error;
    }
  };

  // Carregar tickets de todas as abas
  const loadAllTabs = async () => {
    try {
      setLoading(true);

      // Carregar todas as abas em paralelo
      await Promise.all([
        loadTicketsForTab('open', 1, false),
        loadTicketsForTab('pending', 1, false),
        loadTicketsForTab('closed', 1, false),
        loadTicketsForTab('groups', 1, false),
      ]);

      // Resetar páginas
      setPagesByTab({
        open: 1,
        pending: 1,
        closed: 1,
        groups: 1,
      });
    } catch (error: any) {
      console.error('Erro ao carregar tickets:', error);
      Alert.alert('Erro', 'Não foi possível carregar os tickets');
    } finally {
      setLoading(false);
    }
  };

  // Carregar mais tickets da aba atual
  const loadMoreTickets = async () => {
    if (!hasMoreByTab[activeTab] || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagesByTab[activeTab] + 1;

      await loadTicketsForTab(activeTab, nextPage, true);

      setPagesByTab((prev) => ({
        ...prev,
        [activeTab]: nextPage,
      }));
    } catch (error) {
      console.error('Erro ao carregar mais tickets:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Carregar filas do usuário ao iniciar
  useEffect(() => {
    const loadQueues = async () => {
      try {
        // Usar getMyQueues para carregar apenas as filas do usuário logado
        const userQueues = await queuesService.getMyQueues();
        setQueues(userQueues);
        // Por padrão, todas as filas vêm selecionadas
        setSelectedQueueIds(userQueues.map((q) => q.id));
        setQueuesLoaded(true); // Marcar que as filas foram carregadas
      } catch (error) {
        console.error('Erro ao carregar filas:', error);
        setQueues([]);
        setSelectedQueueIds([]);
        setQueuesLoaded(true); // Marcar como carregado mesmo em erro
      }
    };
    loadQueues();
  }, []);

  // Pesquisa com debounce
  useEffect(() => {
    if (!showSearch) return;

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await ticketsService.searchGlobal(searchQuery.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('Erro ao pesquisar:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, showSearch]);

  // Carregar tickets na inicialização e quando filtros mudam
  // IMPORTANTE: Só carregar após as filas terem sido carregadas para evitar enviar filtro incorreto
  useEffect(() => {
    if (!queuesLoaded) return; // Aguardar filas serem carregadas
    loadAllTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, selectedQueueIds, includeNoQueue, queuesLoaded]);

  // Socket.IO Event Handlers
  const handleTicketCreated = useCallback((data: { ticket: Ticket }) => {
    // Verificar se o ticket deve ser exibido baseado nos filtros de fila
    if (!shouldShowTicket(data.ticket)) {
      return;
    }

    // Determinar a aba do ticket
    const ticketTab: TabType = data.ticket.isGroup
      ? 'groups'
      : data.ticket.status.toLowerCase() as TabType;

    setTicketsByTab((prev) => {
      // Verificar se o ticket já existe
      if (prev[ticketTab].some(t => t.id === data.ticket.id)) {
        return prev;
      }

      // Adicionar ticket no início da lista da aba correspondente
      return {
        ...prev,
        [ticketTab]: [data.ticket, ...prev[ticketTab]],
      };
    });

    // Atualizar contador
    setTotalCounts((prev) => {
      return {
        ...prev,
        [ticketTab]: prev[ticketTab] + 1,
      };
    });
  }, [shouldShowTicket]);

  const handleTicketUpdated = useCallback((data: { ticket: Ticket }) => {
    // Verificar se o ticket deve ser exibido baseado nos filtros de fila
    const shouldShow = shouldShowTicket(data.ticket);

    // Determinar a aba do ticket
    const ticketTab: TabType = data.ticket.isGroup
      ? 'groups'
      : data.ticket.status.toLowerCase() as TabType;

    setTicketsByTab((prev) => {
      // Procurar o ticket em todas as abas
      let foundInTab: TabType | null = null;
      const allTabs: TabType[] = ['open', 'pending', 'closed', 'groups'];

      for (const tab of allTabs) {
        if (prev[tab].some(t => t.id === data.ticket.id)) {
          foundInTab = tab;
          break;
        }
      }

      const newState = { ...prev };

      // Se o ticket não deve ser exibido, remover de todas as abas
      if (!shouldShow) {
        if (foundInTab) {
          newState[foundInTab] = newState[foundInTab].filter(t => t.id !== data.ticket.id);
        }
        return newState;
      }

      // Se encontrou em uma aba
      if (foundInTab) {
        // Remover da aba antiga
        newState[foundInTab] = newState[foundInTab].filter(t => t.id !== data.ticket.id);
        // Adicionar no topo da aba correta
        newState[ticketTab] = [data.ticket, ...newState[ticketTab]];
      } else {
        // Ticket não encontrado, adicionar na aba correta
        newState[ticketTab] = [data.ticket, ...newState[ticketTab]];
      }

      return newState;
    });
  }, [shouldShowTicket]);

  const handleTicketNewMessage = useCallback((data: { ticket: Ticket; message: any }) => {
    // Verificar se o ticket deve ser exibido baseado nos filtros de fila
    const shouldShow = shouldShowTicket(data.ticket);

    // Determinar a aba do ticket
    const ticketTab: TabType = data.ticket.isGroup
      ? 'groups'
      : data.ticket.status.toLowerCase() as TabType;

    setTicketsByTab((prev) => {
      // Verificar se o ticket já existe em alguma aba
      let foundInTab: TabType | null = null;
      const allTabs: TabType[] = ['open', 'pending', 'closed', 'groups'];

      for (const tab of allTabs) {
        if (prev[tab].some(t => t.id === data.ticket.id)) {
          foundInTab = tab;
          break;
        }
      }

      // Se o ticket não deve ser exibido, remover se existir
      if (!shouldShow) {
        if (foundInTab) {
          const newState = { ...prev };
          newState[foundInTab] = newState[foundInTab].filter(t => t.id !== data.ticket.id);
          return newState;
        }
        return prev;
      }

      if (foundInTab) {
        // Ticket existe, atualizar
        const tickets = prev[foundInTab];
        const index = tickets.findIndex((t) => t.id === data.ticket.id);

        if (index !== -1) {
          const updated = [...tickets];
          updated[index] = {
            ...updated[index],
            lastMessage: data.ticket.lastMessage,
            lastMessageAt: data.ticket.lastMessageAt,
            lastMessageFromMe: data.ticket.lastMessageFromMe,
            hasUnreadMessages: data.ticket.hasUnreadMessages,
            unreadCount: data.ticket.unreadCount,
          };

          // Mover para o topo apenas se for na mesma aba
          if (foundInTab === ticketTab) {
            const ticket = updated.splice(index, 1)[0];
            return {
              ...prev,
              [ticketTab]: [ticket, ...updated],
            };
          } else {
            // Se mudou de aba, remover da antiga e adicionar na nova
            const newState = { ...prev };
            newState[foundInTab] = updated.filter(t => t.id !== data.ticket.id);
            newState[ticketTab] = [data.ticket, ...newState[ticketTab]];
            return newState;
          }
        }
      }

      // Ticket não existe, adicionar
      return {
        ...prev,
        [ticketTab]: [data.ticket, ...prev[ticketTab]],
      };
    });
  }, [shouldShowTicket]);

  const handleTicketCountsUpdated = useCallback((data: {
    open: number;
    pending: number;
    closed: number;
    groups: number;
  }) => {
    // Só atualizar se receber valores válidos
    if (data && typeof data.open === 'number' && typeof data.pending === 'number') {
    
      setTotalCounts(data);
    } else {
      console.warn('⚠️ Contadores inválidos recebidos:', data);
    }
  }, []);

  const handleTicketDeleted = useCallback((data: { ticketId: string }) => {
    setTicketsByTab((prev) => {
      const newState = { ...prev };
      // Remover de todas as abas
      const allTabs: TabType[] = ['open', 'pending', 'closed', 'groups'];
      allTabs.forEach(tab => {
        newState[tab] = newState[tab].filter((t) => t.id !== data.ticketId);
      });
      return newState;
    });
  }, []);

  // Registrar eventos do Socket.IO
  useEffect(() => {
    on('ticket_created', handleTicketCreated);
    on('ticket_updated', handleTicketUpdated);
    on('ticket_new_message', handleTicketNewMessage);
    on('ticket_counts_updated', handleTicketCountsUpdated);
    on('ticket_deleted', handleTicketDeleted);

    return () => {
      off('ticket_created', handleTicketCreated);
      off('ticket_updated', handleTicketUpdated);
      off('ticket_new_message', handleTicketNewMessage);
      off('ticket_counts_updated', handleTicketCountsUpdated);
      off('ticket_deleted', handleTicketDeleted);
    };
  }, [on, off, handleTicketCreated, handleTicketUpdated, handleTicketNewMessage, handleTicketCountsUpdated, handleTicketDeleted]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllTabs().finally(() => setRefreshing(false));
  };

  // Funções para manipular filtro de filas
  const toggleQueueSelection = (queueId: string) => {
    setSelectedQueueIds((prev) =>
      prev.includes(queueId)
        ? prev.filter((id) => id !== queueId)
        : [...prev, queueId]
    );
  };

  const selectAllQueues = () => {
    setSelectedQueueIds(queues.map((q) => q.id));
    setIncludeNoQueue(true);
  };

  const deselectAllQueues = () => {
    setSelectedQueueIds([]);
    setIncludeNoQueue(false);
  };

  const handleTicketPress = (ticket: Ticket) => {
    navigation.navigate('Chat', { ticket });
  };

  const handleAcceptTicket = async (ticketId: string) => {
    // Buscar o ticket na lista
    const ticket = Object.values(ticketsByTab).flat().find((t) => t.id === ticketId);
    if (!ticket) return;

    // Se o ticket não tem fila, abrir modal para seleção
    if (!ticket.queueId) {
      setPendingTicket({
        id: ticketId,
        contactName: ticket.contact.name,
        mode: 'accept',
      });
      setShowQueueSelectionModal(true);
      return;
    }

    // Se já tem fila, aceitar diretamente
    try {
      await ticketsService.updateTicket(ticketId, { status: 'OPEN', queueId: ticket.queueId });
      handleRefresh();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível aceitar o ticket');
    }
  };

  const handleRejectTicket = async (ticketId: string) => {
    try {
      await ticketsService.updateStatus(ticketId, 'CLOSED');
      handleRefresh();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível recusar o ticket');
    }
  };

  const handleCloseTicket = (ticketId: string) => {
    const ticket = Object.values(ticketsByTab).flat().find((t) => t.id === ticketId);
    if (!ticket) return;
    setTicketToClose(ticket);
    setShowCloseTicketModal(true);
  };

  const handleCloseTicketConfirm = async (sendClosingMessage: boolean, sendRatingMessage: boolean) => {
    if (!ticketToClose) return;
    try {
      setClosingTicket(true);
      await ticketsService.closeTicket(ticketToClose.id, sendClosingMessage, sendRatingMessage);
      setShowCloseTicketModal(false);
      setTicketToClose(null);
      handleRefresh();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível fechar o ticket');
    } finally {
      setClosingTicket(false);
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    // Buscar o ticket na lista
    const ticket = Object.values(ticketsByTab).flat().find((t) => t.id === ticketId);
    if (!ticket) return;

    // Se o ticket não tem fila, abrir modal para seleção
    if (!ticket.queueId) {
      setPendingTicket({
        id: ticketId,
        contactName: ticket.contact.name,
        mode: 'reopen',
      });
      setShowQueueSelectionModal(true);
      return;
    }

    // Se já tem fila, reabrir diretamente
    try {
      await ticketsService.updateTicket(ticketId, { status: 'OPEN', queueId: ticket.queueId });
      handleRefresh();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível reabrir o ticket');
    }
  };

  const handleQueueModalConfirm = async (queueId: string) => {
    if (!pendingTicket) return;

    try {
      await ticketsService.updateTicket(pendingTicket.id, {
        status: 'OPEN',
        queueId,
      });
      setShowQueueSelectionModal(false);
      setPendingTicket(null);
      handleRefresh();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível processar o ticket');
      throw error;
    }
  };

  const handleNewConversation = async (contactId: string, queueId: string, connectionId: string) => {
    try {
      const result = await ticketsService.findOrCreateByContact(contactId, queueId, connectionId);
      setShowNewConversationModal(false);

      if (result.alreadyOpen) {
        Alert.alert('Aviso', result.message || 'Já existe um ticket aberto para este contato');
      }

      // Navegar para o chat do ticket
      navigation.navigate('Chat', { ticket: result.ticket });
      handleRefresh();
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao criar conversa';
      Alert.alert('Erro', msg);
    }
  };

  const formatBadgeCount = (count: number): string => {
    return count > 999 ? '999+' : count.toString();
  };

  // Pegar tickets da aba ativa
  const currentTickets = ticketsByTab[activeTab];

  // Filtrar por "apenas não lidos"
  const filteredTickets = React.useMemo(() => {
    if (!onlyUnread) return currentTickets;
    return currentTickets.filter((ticket) => ticket.hasUnreadMessages);
  }, [currentTickets, onlyUnread]);



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Conversas</Text>
          <Text style={styles.subtitle}>Olá, {user?.name}!</Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, showSearch && styles.actionButtonActive]}
          onPress={() => {
            setShowSearch(!showSearch);
            if (showSearch) {
              setSearchQuery('');
              setSearchResults([]);
            }
          }}
        >
          <Text style={[styles.actionButtonText, showSearch && styles.actionButtonTextActive]}>🔍 Pesquisar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowNewConversationModal(true)}
        >
          <Text style={styles.actionButtonText}>➕ Novo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowQueueFilterModal(true)}
        >
          <Text style={styles.actionButtonText}>🏷️ Filas</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Nome, telefone ou ID do ticket..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClear}
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showSearch && searchQuery.trim() ? (
        /* Search Results */
        searchLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Pesquisando...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const status = item.status.toLowerCase() as TabType;
              return (
                <TicketCard
                  ticket={item}
                  onPress={() => handleTicketPress(item)}
                  onAccept={status === 'pending' ? () => handleAcceptTicket(item.id) : undefined}
                  onReject={status === 'pending' ? () => handleRejectTicket(item.id) : undefined}
                  onClose={status === 'open' ? () => handleCloseTicket(item.id) : undefined}
                  onReopen={status === 'closed' ? () => handleReopenTicket(item.id) : undefined}
                  currentStatus={status}
                />
              );
            }}
            ListHeaderComponent={
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsText}>
                  {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
              </View>
            }
          />
        )
      ) : showSearch ? (
        <View style={styles.searchPrompt}>
          <Text style={styles.searchPromptIcon}>🔍</Text>
          <Text style={styles.searchPromptText}>Digite para pesquisar</Text>
          <Text style={styles.searchPromptHint}>Busque por nome, telefone ou ID do ticket</Text>
        </View>
      ) : (
        <>
          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'open' && styles.tabActive]}
              onPress={() => setActiveTab('open')}
            >
              <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
                Abertos {totalCounts.open > 0 && `(${formatBadgeCount(totalCounts.open)})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Pendentes {totalCounts.pending > 0 && `(${formatBadgeCount(totalCounts.pending)})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'closed' && styles.tabActive]}
              onPress={() => setActiveTab('closed')}
            >
              <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
                Fechados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
              onPress={() => setActiveTab('groups')}
            >
              <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
                Grupos {totalCounts.groups > 0 && `(${formatBadgeCount(totalCounts.groups)})`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filters}>
            <TouchableOpacity
              style={[styles.filterButton, onlyUnread && styles.filterButtonActive]}
              onPress={() => setOnlyUnread(!onlyUnread)}
            >
              <Text style={[styles.filterText, onlyUnread && styles.filterTextActive]}>
                Apenas não lidos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, showAll && styles.filterButtonActive]}
              onPress={() => setShowAll(!showAll)}
            >
              <Text style={[styles.filterText, showAll && styles.filterTextActive]}>
                Mostrar todos
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tickets List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>Carregando tickets...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTickets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TicketCard
                  ticket={item}
                  onPress={() => handleTicketPress(item)}
                  onAccept={activeTab === 'pending' ? () => handleAcceptTicket(item.id) : undefined}
                  onReject={activeTab === 'pending' ? () => handleRejectTicket(item.id) : undefined}
                  onClose={activeTab === 'open' ? () => handleCloseTicket(item.id) : undefined}
                  onReopen={activeTab === 'closed' ? () => handleReopenTicket(item.id) : undefined}
                  currentStatus={activeTab}
                />
              )}
              onEndReached={loadMoreTickets}
              onEndReachedThreshold={0.5}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#8b5cf6']}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhum ticket encontrado</Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {/* Modal de Filtro de Filas */}
      <QueueFilterModal
        visible={showQueueFilterModal}
        onClose={() => setShowQueueFilterModal(false)}
        queues={queues}
        selectedQueueIds={selectedQueueIds}
        onQueueToggle={toggleQueueSelection}
        includeNoQueue={includeNoQueue}
        onIncludeNoQueueToggle={() => setIncludeNoQueue(!includeNoQueue)}
        onSelectAll={selectAllQueues}
        onDeselectAll={deselectAllQueues}
        showTicketsWithoutQueue={user?.showTicketsWithoutQueue !== false}
      />

      {/* Modal de Fechar Ticket */}
      <CloseTicketModal
        visible={showCloseTicketModal}
        onClose={() => {
          setShowCloseTicketModal(false);
          setTicketToClose(null);
        }}
        onConfirm={handleCloseTicketConfirm}
        ticket={ticketToClose}
        loading={closingTicket}
      />

      {/* Modal de Seleção de Fila (aceitar/reabrir ticket sem fila) */}
      <QueueSelectionModal
        visible={showQueueSelectionModal}
        onClose={() => {
          setShowQueueSelectionModal(false);
          setPendingTicket(null);
        }}
        onConfirm={handleQueueModalConfirm}
        contactName={pendingTicket?.contactName || ''}
        mode={pendingTicket?.mode || 'accept'}
      />

      {/* Modal de Nova Conversa */}
      <NewConversationModal
        visible={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onCreateConversation={handleNewConversation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  actionButtonTextActive: {
    color: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  searchClear: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchResultsText: {
    fontSize: 13,
    color: '#6b7280',
  },
  searchPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  searchPromptIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  searchPromptText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  searchPromptHint: {
    fontSize: 13,
    color: '#9ca3af',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8b5cf6',
    fontWeight: '700',
  },
  filters: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  footerLoading: {
    padding: 16,
    alignItems: 'center',
  },
});
