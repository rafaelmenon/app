import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { QuickReply, QuickReplyGroup } from '@/types';
import { quickReplyService } from '@/services/quickReply';

interface QuickRepliesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (message: string) => void;
}

export function QuickRepliesModal({
  visible,
  onClose,
  onSelect,
}: QuickRepliesModalProps) {

  const [quickReplyGroups, setQuickReplyGroups] = useState<QuickReplyGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupItems, setGroupItems] = useState<Record<string, QuickReply[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);

  const loadQuickReplyGroups = async () => {
    if (loadingGroups) return;

    setLoadingGroups(true);
    try {
      const groups = await quickReplyService.listGroups();

      setQuickReplyGroups(groups);
    } catch (error) {
      console.error("Erro ao carregar grupos de respostas rápidas:", error);
    } finally {
      setLoadingGroups(false);
    }
  };
    
  const toggleGroup = async (groupId: string | undefined) => {
    const key = groupId ?? 'ungrouped';

    if (expandedGroupId === key) {
      setExpandedGroupId(null);
      return;
    }

    setExpandedGroupId(key);

    if (!groupItems[key]) {
      setLoadingItems(key);
      try {
        const items = await quickReplyService.listQuickReplies(groupId);
        setGroupItems(prev => ({ ...prev, [key]: items }));
      } catch (error) {
        console.error('Erro ao carregar respostas rápidas:', error);
      } finally {
        setLoadingItems(null);
      }
    }
  };

  useEffect(() => {
    if (visible && quickReplyGroups.length === 0) {
      loadQuickReplyGroups();
    }
  }, [visible]);


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Respostas Rápidas</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          
          {quickReplyGroups.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="hash" size={36} color="#d1d5db" />
              <Text style={styles.emptyText}>
                Nenhuma resposta rápida cadastrada
              </Text>
            </View>
          ) : (
            <ScrollView>
              {/* Card fixo: Sem grupo */}
              <TouchableOpacity
                style={styles.groupCard}
                onPress={() => toggleGroup(undefined)}
                activeOpacity={0.7}
              >
                <View style={styles.groupIcon}>
                  <Feather name="hash" size={20} color="#6b7280" />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupTitle}>Sem grupo</Text>
                  <Text style={styles.groupSubtitle}>
                    Respostas rápidas não agrupadas
                  </Text>
                </View>
                <Feather
                  name={expandedGroupId === 'ungrouped' ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>

              {expandedGroupId === 'ungrouped' && (
                <View style={styles.expandedItems}>
                  {loadingItems === 'ungrouped' ? (
                    <ActivityIndicator size="small" color="#6b7280" style={styles.loadingIndicator} />
                  ) : (groupItems['ungrouped'] ?? []).length === 0 ? (
                    <Text style={styles.emptyItemsText}>
                      Nenhuma resposta rápida neste grupo
                    </Text>
                  ) : (
                    groupItems['ungrouped']!.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.groupItem}
                        onPress={() => {
                          onSelect?.(item.message);
                          onClose();
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.groupItemTitle}>{item.shortcut}</Text>
                        <Text style={styles.groupItemMessage} numberOfLines={1}>
                          {item.message}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Cards dos grupos */}
              {quickReplyGroups.map(group => {
                const isExpanded = expandedGroupId === group.id;
                const items = groupItems[group.id] ?? [];

                return (
                  <React.Fragment key={group.id}>
                    <TouchableOpacity
                      style={styles.groupCard}
                      onPress={() => toggleGroup(group.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.groupIcon}>
                        <Feather name="folder" size={20} color="#6b7280" />
                      </View>
                      <View style={styles.groupInfo}>
                        <Text style={styles.groupTitle}>{group.name}</Text>
                        <Text style={styles.groupSubtitle}>
                          {group.isPublic
                            ? `Público - criado por ${group.user.name}`
                            : `Privado - criado por ${group.user.name}`}
                        </Text>
                      </View>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedItems}>
                        {loadingItems === group.id ? (
                          <ActivityIndicator size="small" color="#6b7280" style={styles.loadingIndicator} />
                        ) : items.length === 0 ? (
                          <Text style={styles.emptyItemsText}>
                            Nenhuma resposta rápida neste grupo
                          </Text>
                        ) : (
                          items.map(item => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.groupItem}
                              onPress={() => {
                                onSelect?.(item.message);
                                onClose();
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.groupItemTitle}>{item.shortcut}</Text>
                              <Text style={styles.groupItemMessage} numberOfLines={1}>
                                {item.message}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}
                  </React.Fragment>
                );
              })}
            </ScrollView>
          )}

        </View>
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
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '60%',
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  groupSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  expandedItems: {
    backgroundColor: '#fafafa',
    paddingBottom: 4,
  },
  loadingIndicator: {
    paddingVertical: 16,
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 16,
  },
  groupItem: {
    paddingHorizontal: 20,
    paddingLeft: 68,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  groupItemMessage: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});
