import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ContactMessageProps {
  content: string;
  isFromMe: boolean;
}

interface ContactData {
  name: string;
  phone: string;
  email?: string;
}

export function ContactMessage({ content, isFromMe }: ContactMessageProps) {
  const [contactData, setContactData] = useState<ContactData | null>(null);

  useEffect(() => {
    try {
      const parsedContent = JSON.parse(content);

      if (parsedContent.vcard) {
        const vcard = parsedContent.vcard;

        // Extrair informações básicas do vCard
        const nameMatch = vcard.match(/FN:(.+)/i);
        const phoneMatch = vcard.match(/TEL[^:]*:(.+)/i);
        const emailMatch = vcard.match(/EMAIL[^:]*:(.+)/i);

        const extractedPhone = phoneMatch ? phoneMatch[1].trim().replace(/\D/g, '') : '';

        setContactData({
          name: nameMatch ? nameMatch[1].trim() : parsedContent.displayName || 'Contato',
          phone: extractedPhone,
          email: emailMatch ? emailMatch[1].trim() : undefined,
        });
      }
    } catch (error) {
      console.error('Erro ao processar vCard:', error);
      // Fallback para display name simples
      const displayName = content.match(/\[Contato\] (.+)/)?.[1] || 'Contato';
      setContactData({
        name: displayName,
        phone: '',
        email: undefined,
      });
    }
  }, [content]);

  if (!contactData) {
    return (
      <View
        style={[
          styles.container,
          isFromMe ? styles.containerFromMe : styles.containerFromContact,
        ]}
      >
        <View style={[styles.avatar, isFromMe ? styles.avatarFromMe : styles.avatarFromContact]}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
        <Text style={[styles.loadingText, { color: isFromMe ? '#111827' : '#ffffff' }]}>
          Carregando contato...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isFromMe ? styles.containerFromMe : styles.containerFromContact,
      ]}
    >
      <View style={[styles.avatar, isFromMe ? styles.avatarFromMe : styles.avatarFromContact]}>
        <Text style={styles.avatarIcon}>👤</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text
          style={[styles.name, { color: isFromMe ? '#111827' : '#374151' }]}
          numberOfLines={1}
        >
          {contactData.name}
        </Text>

        {contactData.phone && (
          <Text
            style={[styles.detail, { color: isFromMe ? '#6b7280' : '#6b7280' }]}
            numberOfLines={1}
          >
            📞 {contactData.phone}
          </Text>
        )}

        {contactData.email && (
          <Text
            style={[styles.detail, { color: isFromMe ? '#6b7280' : '#6b7280' }]}
            numberOfLines={1}
          >
            ✉️ {contactData.email}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 240,
    maxWidth: 280,
    borderWidth: 2,
  },
  containerFromMe: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: '#bfdbfe',
  },
  containerFromContact: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarFromMe: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  avatarFromContact: {
    backgroundColor: '#3b82f6',
  },
  avatarIcon: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  icon: {
    fontSize: 11,
    marginRight: 4,
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingText: {
    fontSize: 13,
    marginLeft: 8,
  },
});
