import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Ticket } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  onPress: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  showActions?: boolean;
  currentStatus?: 'open' | 'pending' | 'closed' | 'groups';
}

export function TicketCard({
  ticket,
  onPress,
  onAccept,
  onReject,
  onClose,
  onReopen,
  showActions = true,
  currentStatus = 'open',
}: TicketCardProps) {
  const formatMessageTime = (date: string | null) => {
    if (!date) return '';

    const messageDate = new Date(date);

    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    } else if (isYesterday(messageDate)) {
      return 'Ontem';
    } else {
      return format(messageDate, 'dd/MM/yy');
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        ticket.hasUnreadMessages && styles.cardUnread
      ]}
    >
      {/* Avatar e Info Principal */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {ticket.contact.profilePicture ? (
            <Image
              source={{ uri: ticket.contact.profilePicture }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {getInitials(ticket.contact.name)}
              </Text>
            </View>
          )}
          {ticket.hasUnreadMessages && ticket.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {ticket.unreadCount > 99 ? '99+' : ticket.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName} numberOfLines={1}>
              {ticket.contact.name}
            </Text>
            <Text style={styles.time}>
              {formatMessageTime(ticket.lastMessageAt)}
            </Text>
          </View>

          <Text style={styles.lastMessage} numberOfLines={2}>
            {ticket.lastMessage || 'Sem mensagens'}
          </Text>

          {/* Tags e Info */}
          <View style={styles.tags}>
            {ticket.queue && (
              <View style={[styles.tag, { backgroundColor: ticket.queue.color + '20' }]}>
                <Text style={[styles.tagText, { color: ticket.queue.color }]} numberOfLines={1}>
                  {ticket.queue.name}
                </Text>
              </View>
            )}

            <View style={[styles.tag, { backgroundColor: ticket.connection.color + '20' }]}>
              <Text style={[styles.tagText, { color: ticket.connection.color }]} numberOfLines={1}>
                {ticket.connection.name}
              </Text>
            </View>

            {ticket.user && (
              <View style={[styles.tag, styles.userTag]}>
                <Text style={styles.userTagText} numberOfLines={1}>
                  👤 {ticket.user.name}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Ações */}
      {showActions && (
        <View style={styles.actions}>
          {currentStatus === 'pending' && onAccept && (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={(e) => {
                e.stopPropagation();
                onAccept();
              }}
            >
              <Text style={styles.actionButtonText}>Aceitar</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'pending' && onReject && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={(e) => {
                e.stopPropagation();
                onReject();
              }}
            >
              <Text style={styles.actionButtonText}>Recusar</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'open' && onClose && (
            <TouchableOpacity
              style={[styles.actionButton, styles.closeButton]}
              onPress={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <Text style={styles.actionButtonText}>Fechar</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'closed' && onReopen && (
            <TouchableOpacity
              style={[styles.actionButton, styles.reopenButton]}
              onPress={(e) => {
                e.stopPropagation();
                onReopen();
              }}
            >
              <Text style={styles.actionButtonText}>Reabrir</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 16,
  },
  cardUnread: {
    backgroundColor: '#f0f9ff',
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: '#6b7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#6b7280',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 120,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userTag: {
    backgroundColor: '#f3f4f6',
  },
  userTagText: {
    fontSize: 11,
    color: '#4b5563',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  closeButton: {
    backgroundColor: '#6b7280',
  },
  reopenButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
