import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MetaTemplate } from '@/types';
import { metaTemplateService } from '@/services/metaTemplate';
import { AxiosError } from 'axios';

interface SendTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  ticketId: string;
  connectionId?: string;
  contactName?: string;
  onSuccess?: () => void;
}

interface CurrentMedia {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isOriginal: boolean;
}

const MEDIA_LIMITS: Record<string, { maxSize: number; mimeTypes: string[]; description: string; maxSizeMB: string }> = {
  IMAGE: {
    maxSize: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png'],
    description: 'Imagem (JPEG, PNG)',
    maxSizeMB: '5MB',
  },
  VIDEO: {
    maxSize: 16 * 1024 * 1024,
    mimeTypes: ['video/mp4'],
    description: 'Video (MP4)',
    maxSizeMB: '16MB',
  },
  DOCUMENT: {
    maxSize: 100 * 1024 * 1024,
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
    description: 'Documento (PDF, Word, Excel, PowerPoint, TXT)',
    maxSizeMB: '100MB',
  },
};

const getCategoryLabel = (category: string) => {
  const categories: Record<string, string> = {
    MARKETING: 'Marketing',
    UTILITY: 'Utilidade',
    AUTHENTICATION: 'Autenticacao',
  };
  return categories[category] || category;
};

const getStatusIcon = (status: string): { name: React.ComponentProps<typeof Feather>['name']; color: string } => {
  const config: Record<string, { name: React.ComponentProps<typeof Feather>['name']; color: string }> = {
    APPROVED: { name: 'check-circle', color: '#16a34a' },
    PENDING: { name: 'clock', color: '#ca8a04' },
    REJECTED: { name: 'x-circle', color: '#dc2626' },
  };
  return config[status] || config.PENDING;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getMediaIcon = (format: string): React.ComponentProps<typeof Feather>['name'] => {
  if (format === 'IMAGE') return 'image';
  if (format === 'VIDEO') return 'video';
  return 'file-text';
};

export function SendTemplateModal({
  visible,
  onClose,
  ticketId,
  connectionId,
  contactName,
  onSuccess,
}: SendTemplateModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentMedia, setCurrentMedia] = useState<CurrentMedia | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  useEffect(() => {
    if (visible && connectionId) {
      const fetchTemplates = async () => {
        try {
          setLoading(true);
          const data = await metaTemplateService.listTemplates(connectionId);
          const approvedTemplates = data.filter(t => t.status === 'APPROVED');
          setTemplates(approvedTemplates);
        } catch (error) {
          console.error('Erro ao carregar templates:', error);
          Alert.alert('Erro', 'Erro ao carregar templates');
        } finally {
          setLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [visible, connectionId]);

  useEffect(() => {
    if (!visible) {
      setSelectedTemplate(null);
      setVariables([]);
      setSearchTerm('');
      setCurrentMedia(null);
      setMediaPreview(null);
    }
  }, [visible]);

  useEffect(() => {
    if (selectedTemplate) {
      const varCount = metaTemplateService.extractVariables(selectedTemplate);
      const initialVars = Array(varCount).fill('');
      if (varCount > 0 && contactName) {
        initialVars[0] = contactName;
      }
      setVariables(initialVars);

      if (selectedTemplate.headerMedia) {
        setCurrentMedia({
          url: selectedTemplate.headerMedia.url,
          fileName: selectedTemplate.headerMedia.fileName,
          fileSize: selectedTemplate.headerMedia.fileSize,
          mimeType: selectedTemplate.headerMedia.mimeType,
          isOriginal: true,
        });
        if (selectedTemplate.headerMedia.type === 'IMAGE') {
          setMediaPreview(selectedTemplate.headerMedia.url);
        }
      } else {
        setCurrentMedia(null);
        setMediaPreview(null);
      }
    }
  }, [selectedTemplate, contactName]);

  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates;
    const term = searchTerm.toLowerCase();
    return templates.filter(template => {
      const nameMatch = template.name.toLowerCase().includes(term);
      const bodyText = metaTemplateService.getBodyText(template).toLowerCase();
      const bodyMatch = bodyText.includes(term);
      const categoryMatch = getCategoryLabel(template.category).toLowerCase().includes(term);
      return nameMatch || bodyMatch || categoryMatch;
    });
  }, [templates, searchTerm]);

  const hasMediaHeader = useMemo(() => {
    if (!selectedTemplate) return false;
    return metaTemplateService.hasMediaHeader(selectedTemplate);
  }, [selectedTemplate]);

  const headerFormat = useMemo(() => {
    if (!selectedTemplate) return null;
    return metaTemplateService.getHeaderFormat(selectedTemplate) as 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null;
  }, [selectedTemplate]);

  const pickFile = useCallback(async () => {
    if (!headerFormat || !connectionId) return;

    try {
      let fileUri: string | undefined;
      let fileName: string | undefined;
      let mimeType: string | undefined;

      if (headerFormat === 'IMAGE') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'image.jpg';
        mimeType = asset.mimeType ?? 'image/jpeg';
      } else if (headerFormat === 'VIDEO') {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['videos'],
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileName = asset.fileName ?? asset.uri.split('/').pop() ?? 'video.mp4';
        mimeType = asset.mimeType ?? 'video/mp4';
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        fileUri = asset.uri;
        fileName = asset.name;
        mimeType = asset.mimeType ?? 'application/octet-stream';
      }

      if (!fileUri || !fileName || !mimeType) return;

      setUploadingMedia(true);

      const response = await metaTemplateService.uploadMedia(
        connectionId,
        fileUri,
        fileName,
        mimeType,
        headerFormat,
      );

      if (response.s3Url) {
        setCurrentMedia({
          url: response.s3Url,
          fileName: response.fileName || fileName,
          fileSize: response.fileSize || 0,
          mimeType: response.mimeType || mimeType,
          isOriginal: false,
        });

        if (headerFormat === 'IMAGE') {
          setMediaPreview(response.s3Url);
        } else {
          setMediaPreview(null);
        }

        Alert.alert('Sucesso', 'Arquivo enviado com sucesso!');
      } else {
        throw new Error('URL do S3 nao retornada');
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const message = error?.response?.data?.message;
        if (message) {
          if (message.includes('Tipo de arquivo não permitido para DOCUMENT')) {
            Alert.alert('Erro', `Tipo de arquivo inválido. Permitido:\n${MEDIA_LIMITS['DOCUMENT'].description}.`);
          }
          return;
        }
      }
      console.error('Erro ao fazer upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar arquivo';
      Alert.alert('Erro', errorMessage);
    } finally {
      setUploadingMedia(false);
    }
  }, [connectionId, headerFormat]);

  const restoreOriginalMedia = () => {
    if (selectedTemplate?.headerMedia) {
      setCurrentMedia({
        url: selectedTemplate.headerMedia.url,
        fileName: selectedTemplate.headerMedia.fileName,
        fileSize: selectedTemplate.headerMedia.fileSize,
        mimeType: selectedTemplate.headerMedia.mimeType,
        isOriginal: true,
      });
      if (selectedTemplate.headerMedia.type === 'IMAGE') {
        setMediaPreview(selectedTemplate.headerMedia.url);
      } else {
        setMediaPreview(null);
      }
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;

    const varCount = metaTemplateService.extractVariables(selectedTemplate);
    for (let i = 0; i < varCount; i++) {
      if (!variables[i]?.trim()) {
        Alert.alert('Atenção', `Preencha o valor da variavel ${i + 1}`);
        return;
      }
    }

    if (hasMediaHeader && !currentMedia) {
      Alert.alert('Atenção', 'Selecione um arquivo para o cabecalho do template');
      return;
    }

    try {
      setSending(true);

      let bodyText = metaTemplateService.getBodyText(selectedTemplate);
      const headerText = metaTemplateService.getHeaderText(selectedTemplate);
      const footerText = metaTemplateService.getFooterText(selectedTemplate);

      variables.forEach((value, index) => {
        bodyText = bodyText.replace(`{{${index + 1}}}`, value);
      });

      let messageContent = '';
      if (headerText) {
        messageContent += `*${headerText}*\n\n`;
      }
      messageContent += bodyText;
      if (footerText) {
        messageContent += `\n\n_${footerText}_`;
      }

      let headerMedia: { type: string; url: string; filename?: string } | undefined;
      if (hasMediaHeader && currentMedia && headerFormat) {
        headerMedia = {
          type: headerFormat.toLowerCase(),
          url: currentMedia.url,
          filename: currentMedia.fileName,
        };
      }

      await metaTemplateService.sendTemplate(
        ticketId,
        selectedTemplate.name,
        selectedTemplate.language,
        variables.length > 0 ? variables : undefined,
        messageContent,
        headerMedia,
      );

      Alert.alert('Sucesso', 'Template enviado com sucesso!');
      onClose();
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Erro ao enviar template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar template';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSending(false);
    }
  };

  const renderMediaSection = () => {
    if (!hasMediaHeader || !headerFormat) return null;
    const limits = MEDIA_LIMITS[headerFormat];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Arquivo do Cabecalho ({limits.description})
        </Text>

        {uploadingMedia ? (
          <View style={styles.mediaUploadingBox}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.mediaUploadingText}>Enviando arquivo...</Text>
          </View>
        ) : currentMedia ? (
          <View style={styles.mediaInfoBox}>
            <View style={styles.mediaInfoRow}>
              {headerFormat === 'IMAGE' && mediaPreview ? (
                <Image source={{ uri: mediaPreview }} style={styles.mediaThumb} />
              ) : (
                <View style={[styles.mediaIconBox, headerFormat === 'VIDEO' ? styles.mediaIconPurple : styles.mediaIconRed]}>
                  <Feather name={getMediaIcon(headerFormat)} size={24} color={headerFormat === 'VIDEO' ? '#a855f7' : '#ef4444'} />
                </View>
              )}
              <View style={styles.mediaDetails}>
                <Text style={styles.mediaFileName} numberOfLines={1}>{currentMedia.fileName}</Text>
                <Text style={styles.mediaFileSize}>{formatFileSize(currentMedia.fileSize)}</Text>
                {currentMedia.isOriginal ? (
                  <View style={styles.mediaOriginalRow}>
                    <Feather name="check-circle" size={12} color="#16a34a" />
                    <Text style={styles.mediaOriginalText}>Arquivo original do template</Text>
                  </View>
                ) : (
                  <Text style={styles.mediaSelectedText}>Arquivo selecionado para este envio</Text>
                )}
              </View>
            </View>

            <View style={styles.mediaActions}>
              <TouchableOpacity style={styles.mediaActionBtn} onPress={pickFile} activeOpacity={0.7}>
                <Feather name="upload-cloud" size={16} color="#374151" />
                <Text style={styles.mediaActionBtnText}>Trocar arquivo</Text>
              </TouchableOpacity>
              {!currentMedia.isOriginal && selectedTemplate?.headerMedia && (
                <TouchableOpacity style={styles.mediaRestoreBtn} onPress={restoreOriginalMedia} activeOpacity={0.7}>
                  <Feather name="refresh-cw" size={16} color="#16a34a" />
                  <Text style={styles.mediaRestoreBtnText}>Restaurar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.mediaDropZone} onPress={pickFile} activeOpacity={0.7}>
            <Feather name="upload-cloud" size={32} color="#9ca3af" />
            <Text style={styles.mediaDropZoneText}>Toque para selecionar um arquivo</Text>
            <Text style={styles.mediaDropZoneHint}>{limits.description} - Max {limits.maxSizeMB}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoBox}>
          <Feather name="alert-circle" size={14} color="#2563eb" style={{ marginTop: 2 }} />
          <Text style={styles.infoBoxText}>
            {selectedTemplate?.headerMedia
              ? `Voce pode usar o arquivo original ou selecionar outro. O novo arquivo deve ser do tipo ${limits.description}.`
              : `Este template requer um arquivo do tipo ${limits.description}. Selecione um arquivo para continuar.`}
          </Text>
        </View>
      </View>
    );
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    let bodyText = metaTemplateService.getBodyText(selectedTemplate);
    const headerText = metaTemplateService.getHeaderText(selectedTemplate);
    const footerText = metaTemplateService.getFooterText(selectedTemplate);

    variables.forEach((value, index) => {
      bodyText = bodyText.replace(`{{${index + 1}}}`, value || `[Variavel ${index + 1}]`);
    });

    return (
      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>Preview da mensagem:</Text>

        {hasMediaHeader && currentMedia && headerFormat === 'IMAGE' && mediaPreview && (
          <Image source={{ uri: mediaPreview }} style={styles.previewImage} resizeMode="contain" />
        )}
        {hasMediaHeader && currentMedia && headerFormat === 'VIDEO' && (
          <View style={styles.previewMediaRow}>
            <Feather name="video" size={16} color="#7c3aed" />
            <Text style={styles.previewMediaName}>{currentMedia.fileName}</Text>
          </View>
        )}
        {hasMediaHeader && currentMedia && headerFormat === 'DOCUMENT' && (
          <View style={[styles.previewMediaRow, { backgroundColor: '#fee2e2' }]}>
            <Feather name="file-text" size={16} color="#dc2626" />
            <Text style={[styles.previewMediaName, { color: '#991b1b' }]}>{currentMedia.fileName}</Text>
          </View>
        )}

        {headerText ? <Text style={styles.previewHeader}>{headerText}</Text> : null}
        <Text style={styles.previewBody}>{bodyText}</Text>
        {footerText ? <Text style={styles.previewFooter}>{footerText}</Text> : null}
      </View>
    );
  };

  const renderTemplateList = () => {
    if (templates.length === 0) {
      return (
        <View style={styles.empty}>
          <Feather name="file-text" size={40} color="#d1d5db" />
          <Text style={styles.emptyText}>Nenhum template aprovado encontrado</Text>
          <Text style={styles.emptySubtext}>Crie templates na pagina Templates Meta</Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Pesquisar template..."
            placeholderTextColor="#9ca3af"
          />
        </View>

        {filteredTemplates.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>Nenhum template encontrado para "{searchTerm}"</Text>
            <Text style={styles.emptySubtext}>Tente buscar por outro termo</Text>
          </View>
        ) : (
          filteredTemplates.map((template) => {
            const statusIcon = getStatusIcon(template.status);
            const bodyText = metaTemplateService.getBodyText(template);
            const varCount = metaTemplateService.extractVariables(template);
            const hasMedia = metaTemplateService.hasMediaHeader(template);
            const mediaType = metaTemplateService.getHeaderFormat(template);

            return (
              <TouchableOpacity
                key={template.id || template.name}
                style={styles.templateCard}
                onPress={() => setSelectedTemplate(template)}
                activeOpacity={0.7}
              >
                <View style={styles.templateCardHeader}>
                  <Text style={styles.templateName} numberOfLines={1}>{template.name}</Text>
                  <Feather name={statusIcon.name} size={16} color={statusIcon.color} />
                </View>
                <Text style={styles.templateBody} numberOfLines={2}>{bodyText}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.badgeGray}>
                    <Text style={styles.badgeGrayText}>{getCategoryLabel(template.category)}</Text>
                  </View>
                  {varCount > 0 && (
                    <View style={styles.badgeBlue}>
                      <Text style={styles.badgeBlueText}>{varCount} variavel(is)</Text>
                    </View>
                  )}
                  {hasMedia && mediaType && (
                    <View style={styles.badgePurple}>
                      <Feather name={getMediaIcon(mediaType)} size={12} color="#7c3aed" />
                      <Text style={styles.badgePurpleText}>{mediaType}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </>
    );
  };

  const renderForm = () => {
    if (!selectedTemplate) return null;

    return (
      <>
        <View style={styles.templateInfoBox}>
          <View style={styles.templateInfoRow}>
            <Text style={styles.templateInfoName}>{selectedTemplate.name}</Text>
            <View style={styles.badgeGray}>
              <Text style={styles.badgeGrayText}>{getCategoryLabel(selectedTemplate.category)}</Text>
            </View>
          </View>
          <Text style={styles.templateInfoLang}>Idioma: {selectedTemplate.language}</Text>
        </View>

        {renderMediaSection()}

        {variables.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preencha as variaveis:</Text>
            {variables.map((value, index) => (
              <View key={index} style={styles.variableField}>
                <Text style={styles.variableLabel}>Variavel {index + 1} {`{{${index + 1}}}`}</Text>
                <TextInput
                  style={styles.variableInput}
                  value={value}
                  onChangeText={(text) => {
                    const newVars = [...variables];
                    newVars[index] = text;
                    setVariables(newVars);
                  }}
                  placeholder={`Valor para {{${index + 1}}}`}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ))}
          </View>
        )}

        {renderPreview()}

        <View style={styles.warningBox}>
          <Feather name="alert-circle" size={14} color="#ca8a04" style={{ marginTop: 2 }} />
          <Text style={styles.warningBoxText}>
            O template sera enviado exatamente como mostrado no preview acima.
            Verifique se as variaveis estao corretas antes de enviar.
          </Text>
        </View>
      </>
    );
  };

  const sendDisabled = sending || uploadingMedia || (hasMediaHeader && !currentMedia);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {selectedTemplate && (
                <TouchableOpacity onPress={() => setSelectedTemplate(null)} style={styles.backBtn}>
                  <Feather name="chevron-left" size={22} color="#6b7280" />
                </TouchableOpacity>
              )}
              <Feather name="file-text" size={20} color="#666" />
              <Text style={styles.title}>
                {selectedTemplate ? 'Enviar Template' : 'Selecionar Template'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} keyboardShouldPersistTaps="handled">
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : !selectedTemplate ? (
              renderTemplateList()
            ) : (
              renderForm()
            )}
          </ScrollView>

          {selectedTemplate && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.sendBtn, sendDisabled && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={sendDisabled}
                activeOpacity={0.7}
              >
                {sending ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.sendBtnText}>Enviando...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="send" size={18} color="#fff" />
                    <Text style={styles.sendBtnText}>Enviar Template</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    maxHeight: '85%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginRight: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },

  content: {
    flexShrink: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 8,
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    padding: 0,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },

  templateCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  templateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  templateBody: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeGray: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeGrayText: {
    fontSize: 11,
    color: '#4b5563',
  },
  badgeBlue: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeBlueText: {
    fontSize: 11,
    color: '#2563eb',
  },
  badgePurple: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgePurpleText: {
    fontSize: 11,
    color: '#7c3aed',
  },

  templateInfoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  templateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  templateInfoName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  templateInfoLang: {
    fontSize: 12,
    color: '#6b7280',
  },

  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },

  mediaUploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    gap: 8,
  },
  mediaUploadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  mediaInfoBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
  },
  mediaInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  mediaIconBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaIconPurple: {
    backgroundColor: '#faf5ff',
  },
  mediaIconRed: {
    backgroundColor: '#fef2f2',
  },
  mediaDetails: {
    flex: 1,
  },
  mediaFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  mediaFileSize: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  mediaOriginalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mediaOriginalText: {
    fontSize: 11,
    color: '#16a34a',
  },
  mediaSelectedText: {
    fontSize: 11,
    color: '#2563eb',
    marginTop: 4,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  mediaActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  mediaActionBtnText: {
    fontSize: 13,
    color: '#374151',
  },
  mediaRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
  },
  mediaRestoreBtnText: {
    fontSize: 13,
    color: '#16a34a',
  },
  mediaDropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDropZoneText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
  mediaDropZoneHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#1d4ed8',
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  warningBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#854d0e',
    lineHeight: 16,
  },

  variableField: {
    marginBottom: 10,
  },
  variableLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  variableInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#fff',
  },

  previewBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#16a34a',
    marginBottom: 8,
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewMediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  previewMediaName: {
    fontSize: 13,
    color: '#5b21b6',
    flex: 1,
  },
  previewHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  previewBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  previewFooter: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: 24,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
