import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';

interface DocumentMessageProps {
  fileName: string;
  mediaUrl: string;
  isFromMe: boolean;
}

export function DocumentMessage({ fileName, mediaUrl, isFromMe }: DocumentMessageProps) {
  const [downloading, setDownloading] = useState(false);

  const getFileExtension = (filename: string) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      // Abre a URL do arquivo no navegador para download direto
      const supported = await Linking.canOpenURL(mediaUrl);
      if (supported) {
        await Linking.openURL(mediaUrl);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o arquivo');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao abrir o arquivo');
    } finally {
      setDownloading(false);
    }
  };

  const extension = getFileExtension(fileName);

  return (
    <View
      style={[
        styles.container,
        isFromMe ? styles.containerFromMe : styles.containerFromContact,
      ]}
    >
      <View style={[styles.iconContainer, isFromMe ? styles.iconFromMe : styles.iconFromContact]}>
        <Text style={[styles.extensionText, { color: isFromMe ? '#3b82f6' : '#ffffff' }]}>
          {extension}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text
          style={[styles.fileName, { color: isFromMe ? '#111827' : '#374151' }]}
          numberOfLines={2}
        >
          {fileName}
        </Text>
        <Text style={[styles.fileLabel, { color: isFromMe ? '#9ca3af' : '#9ca3af' }]}>
          Documento
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.downloadButton, isFromMe ? styles.downloadFromMe : styles.downloadFromContact]}
        onPress={handleDownload}
        disabled={downloading}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={isFromMe ? '#3b82f6' : '#ffffff'} />
        ) : (
          <Text style={styles.downloadIcon}>⬇</Text>
        )}
      </TouchableOpacity>
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
    maxWidth: 300,
    borderWidth: 2,
  },
  containerFromMe: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  containerFromContact: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconFromMe: {
    backgroundColor: '#dbeafe',
  },
  iconFromContact: {
    backgroundColor: '#3b82f6',
  },
  extensionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileLabel: {
    fontSize: 12,
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  downloadFromMe: {
    backgroundColor: '#3b82f6',
  },
  downloadFromContact: {
    backgroundColor: '#3b82f6',
  },
  downloadIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
});
