import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Fragment,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Linking,
  Alert,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode, Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import EmojiPicker from "rn-emoji-keyboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSocket } from "../hooks";
import { useAuth } from "../contexts/AuthContext";
import { messagesService, MediaUploadProgress } from "../services/messages";
import {
  AudioPlayer,
  ContactMessage,
  DocumentMessage,
  TransferTicketModal,
} from "../components";
import { AttachModal } from "./components/AttachModal";
import { ChatConfigModal } from "./components/ChatConfigModal";
import { QuickRepliesModal } from "./components/QuickRepliesModal";
import type { Message } from "../types";
import { Feather } from "@expo/vector-icons";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { format } from "date-fns";
import { SendTemplateModal } from "./components/SendTemplateModal";

type ChatScreenProps = NativeStackScreenProps<RootStackParamList, "Chat">;

const STORAGE_KEY_SIGNATURE = "signatureEnabled";
const STORAGE_KEY_WHISPER = "whisperEnabled";

export function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { ticket } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showProfilePicture, setShowProfilePicture] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<MediaUploadProgress | null>(
    null
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showQuickRepliesModal, setShowQuickRepliesModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [whisperMode, setWhisperMode] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const { on, off } = useSocket({
    userId: user?.id,
    companyId: user?.companyId,
    showAll: false,
  });

  const isOfficialConnection = 
    ticket.connection?.integration === "WHATSAPP-BUSINESS" ||
    ticket.connection?.integration === "WHATSAPP-BUSINESS-EMBEDDED";

  // Carregar mensagens
  const loadMessages = async (pageNum = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
        isLoadingMoreRef.current = true;
      }

      const response = await messagesService.getMessagesByTicket(
        ticket.id,
        pageNum,
        20
      );

      setMessages((prev) => {
        if (append) {
          // Carregar mais antigas: adiciona NO INÍCIO da lista
          return [...response.messages, ...prev];
        } else {
          // Primeira carga: substitui tudo
          return response.messages;
        }
      });
      setHasMore(response.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      // Aguardar um pouco antes de resetar a ref para dar tempo do onContentSizeChange processar
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    }
  };

  useEffect(() => {
    loadMessages();
    // Marcar como lido
    messagesService.markAsRead(ticket.id).catch(console.error);
  }, []);

  // Carregar preferência de assinatura do AsyncStorage
  useEffect(() => {
    if (user?.type === "USER") {
      setSignatureEnabled(true);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY_SIGNATURE).then((saved) => {
      if (saved !== null) {
        setSignatureEnabled(JSON.parse(saved));
      }
    });
    AsyncStorage.getItem(STORAGE_KEY_WHISPER).then((saved) => {
      if (saved !== null) {
        setWhisperMode(JSON.parse(saved));
      }
    });
  }, [user?.type]);

  // Detectar quando o teclado abre/fecha para ajustar padding
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardDidShowListener = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(e.endCoordinates.height);
      }
    });
    const keyboardDidHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(0);
      }
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Scroll para o final quando carregar mensagens pela primeira vez
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [loading]);

  // Socket event handler para novas mensagens
  const handleNewMessage = useCallback(
    (data: { message: Message; companyId?: string }) => {
      // Verificar se a mensagem é do ticket atual
      if (data.message.ticketId === ticket.id) {
        setMessages((prev) => {
          // Verificar se a mensagem já existe na lista
          const existingIndex = prev.findIndex(
            (msg) => msg.id === data.message.id
          );

          if (existingIndex !== -1) {
            // Mensagem já existe - atualizar com os novos dados (ex: PROCESSING -> SENT)
            const updated = [...prev];
            updated[existingIndex] = {
              ...prev[existingIndex],
              ...data.message,
            };
            return updated;
          }

          // Mensagem nova - adicionar à lista
          return [...prev, data.message];
        });
        // Scroll para o final
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        // Marcar como lido automaticamente
        messagesService.markAsRead(ticket.id).catch(console.error);
      }
    },
    [ticket.id]
  );

  // Socket event handler para atualização de status
  const handleMessageStatusUpdate = useCallback(
    (data: {
      messageId: string;
      status: string;
      ticketId: string;
      companyId?: string;
    }) => {
      // Só atualizar se for do ticket atual
      if (data.ticketId === ticket.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, status: data.status as any }
              : msg
          )
        );
      }
    },
    [ticket.id]
  );

  // Socket event handler para atualização de mensagem (quando upload completa)
  const handleMessageUpdated = useCallback(
    (data: { message: Message; companyId?: string }) => {
      // Só atualizar se for do ticket atual
      if (data.message.ticketId === ticket.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message.id ? { ...msg, ...data.message } : msg
          )
        );
      }
    },
    [ticket.id]
  );

  // Socket event handler para progresso de upload de mídia
  const handleMediaUploadProgress = useCallback(
    (data: MediaUploadProgress) => {
      // Só processar eventos deste ticket
      if (data.ticketId !== ticket.id) return;

      // Atualizar estado de progresso
      setUploadStage(data);

      // Se completou ou deu erro, limpar após alguns segundos
      if (data.stage === "completed" || data.stage === "error") {
        setTimeout(() => {
          setUploadStage(null);
          setUploadingMedia(false);
          setUploadProgress(0);
        }, 3000);
      }
    },
    [ticket.id]
  );

  useEffect(() => {
    on("message_created", handleNewMessage);
    on("message_status_update", handleMessageStatusUpdate);
    on("message_updated", handleMessageUpdated);
    on("media_upload_progress", handleMediaUploadProgress);

    return () => {
      off("message_created", handleNewMessage);
      off("message_status_update", handleMessageStatusUpdate);
      off("message_updated", handleMessageUpdated);
      off("media_upload_progress", handleMediaUploadProgress);
    };
  }, [
    on,
    off,
    handleNewMessage,
    handleMessageStatusUpdate,
    handleMessageUpdated,
    handleMediaUploadProgress,
  ]);

  const handleSignatureToggle = (enabled: boolean) => {
    if (user?.type === "USER") return;
    setSignatureEnabled(enabled);
    AsyncStorage.setItem(STORAGE_KEY_SIGNATURE, JSON.stringify(enabled));
  };

  const handleWhisperToggle = (enabled: boolean) => {
    setWhisperMode(enabled);
    AsyncStorage.setItem(STORAGE_KEY_WHISPER, JSON.stringify(enabled));
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setSending(true);
      let messageContent = messageText.trim();

      // Aplicar assinatura se habilitada
      if (signatureEnabled && user) {
        messageContent = `*${user.name}:*\n${messageContent}`;
      }

      await messagesService.sendTextMessage(
        ticket.id,
        messageContent,
        whisperMode
      );
      setMessageText("");
      // Scroll para o final após enviar
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSending(false);
    }
  };

  const loadMoreMessages = () => {
    if (!hasMore || loadingMore) return;
    loadMessages(page + 1, true);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize } = event.nativeEvent;
    scrollOffsetRef.current = contentOffset.y;
    contentHeightRef.current = contentSize.height;

    // Se o usuário rolou para o topo (offset Y próximo de 0)
    if (contentOffset.y < 100 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    // Se está carregando mais mensagens antigas
    if (isLoadingMoreRef.current && contentHeightRef.current > 0) {
      const heightDifference = height - contentHeightRef.current;

      // Ajustar scroll para manter a posição visual
      if (heightDifference > 0) {
        const newOffset = scrollOffsetRef.current + heightDifference;
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: newOffset,
            animated: false,
          });
        }, 100);
      }
    }

    contentHeightRef.current = height;
  };

  // === Funções de envio de mídia ===

  const getMimeType = (uri: string, type?: string): string => {
    if (type) return type;
    const ext = uri.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      zip: "application/zip",
      rar: "application/x-rar",
      "7z": "application/x-7z-compressed",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
    };
    return mimeMap[ext] || "application/octet-stream";
  };

  // Tirar foto pela câmera e enviar
  const handleTakePhoto = async () => {
    try {
      // Solicitar permissão da câmera
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso à câmera para tirar fotos",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const fileName = `foto_${Date.now()}.jpg`;
      const fileSize = asset.fileSize || 0;

      // Passo 1: Criar mensagem com status PROCESSING
      // O socket vai receber message_created e adicionar à lista automaticamente
      const { data: backendMessage } =
        await messagesService.prepareMediaMessage(
          ticket.id,
          fileName,
          mimeType,
          fileSize,
          undefined
        );

      // Passo 2: Completar upload em background (não bloqueia a UI)
      messagesService
        .completeMediaUpload(
          backendMessage.id,
          asset.uri,
          fileName,
          mimeType,
          undefined,
          (progress) => setUploadProgress(progress)
        )
        .catch((error) => {
          console.error("Erro ao completar upload da foto:", error);
          // Remover mensagem com erro
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== backendMessage.id)
          );
          Alert.alert("Erro", "Não foi possível enviar a foto");
        });
    } catch (error: any) {
      console.error("Erro ao tirar foto:", error);
      Alert.alert("Erro", "Não foi possível tirar a foto");
    }
  };

  // Gravar vídeo pela câmera e enviar
  const handleRecordVideo = async () => {
    try {
      // Solicitar permissões de câmera e microfone
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso à câmera para gravar vídeos",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["videos"],
        quality: 0.7,
        videoMaxDuration: 60, // Máximo de 60 segundos
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "video/mp4";
      const fileName = `video_${Date.now()}.mp4`;
      const fileSize = asset.fileSize || 0;

      // Passo 1: Criar mensagem com status PROCESSING
      // O socket vai receber message_created e adicionar à lista automaticamente
      const { data: backendMessage } =
        await messagesService.prepareMediaMessage(
          ticket.id,
          fileName,
          mimeType,
          fileSize,
          undefined
        );

      // Passo 2: Completar upload em background (não bloqueia a UI)
      messagesService
        .completeMediaUpload(
          backendMessage.id,
          asset.uri,
          fileName,
          mimeType,
          undefined,
          (progress) => setUploadProgress(progress)
        )
        .catch((error) => {
          console.error("Erro ao completar upload do vídeo:", error);
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== backendMessage.id)
          );
          Alert.alert("Erro", "Não foi possível enviar o vídeo");
        });
    } catch (error: any) {
      console.error("Erro ao gravar vídeo:", error);
      Alert.alert("Erro", "Não foi possível gravar o vídeo");
    }
  };

  // Selecionar da galeria (suporta seleção múltipla)
  const handlePickImage = async () => {
    try {
      const mediaLibraryPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaLibraryPermission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso à galeria para selecionar fotos e vídeos",
          [{ text: "OK" }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (result.canceled || !result.assets?.length) return;

      for (const asset of result.assets) {
        const mimeType = asset.mimeType || getMimeType(asset.uri);
        const fileName =
          asset.fileName ||
          `media_${Date.now()}.${mimeType.split("/")[1] || "jpg"}`;
        const fileSize = asset.fileSize || 0;

        try {
          const { data: backendMessage } =
            await messagesService.prepareMediaMessage(
              ticket.id,
              fileName,
              mimeType,
              fileSize,
              undefined
            );

          messagesService
            .completeMediaUpload(
              backendMessage.id,
              asset.uri,
              fileName,
              mimeType,
              undefined,
              (progress) => setUploadProgress(progress)
            )
            .catch((error) => {
              console.error("Erro ao completar upload da imagem/vídeo:", error);
              setMessages((prev) =>
                prev.filter((msg) => msg.id !== backendMessage.id)
              );
              Alert.alert("Erro", "Não foi possível enviar o arquivo");
            });
        } catch (error) {
          console.error("Erro ao preparar mensagem de mídia:", error);
        }
      }
    } catch (error: any) {
      console.error("Erro ao enviar imagem/vídeo:", error);
      Alert.alert("Erro", "Não foi possível enviar o arquivo");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || getMimeType(asset.uri);
      const fileName = asset.name || `document_${Date.now()}`;
      const fileSize = asset.size || 0;

      // Passo 1: Criar mensagem com status PROCESSING
      // O socket vai receber message_created e adicionar à lista automaticamente
      const { data: backendMessage } =
        await messagesService.prepareMediaMessage(
          ticket.id,
          fileName,
          mimeType,
          fileSize,
          undefined
        );

      // Passo 2: Completar upload em background (não bloqueia a UI)
      messagesService
        .completeMediaUpload(
          backendMessage.id,
          asset.uri,
          fileName,
          mimeType,
          undefined,
          (progress) => setUploadProgress(progress)
        )
        .catch((error) => {
          console.error("Erro ao completar upload do documento:", error);
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== backendMessage.id)
          );
          Alert.alert("Erro", "Não foi possível enviar o documento");
        });
    } catch (error: any) {
      console.error("Erro ao enviar documento:", error);
      Alert.alert("Erro", "Não foi possível enviar o documento");
    }
  };

  const handleStartRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso ao microfone para gravar áudio"
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      Alert.alert("Erro", "Não foi possível iniciar a gravação");
    }
  };

  const handleCancelRecording = async () => {
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (error) {
      console.error("Erro ao cancelar gravação:", error);
    }
  };

  const handleSendRecording = async () => {
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingTime(0);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        Alert.alert("Erro", "Não foi possível obter a gravação");
        return;
      }

      const fileName = `audio_${Date.now()}.m4a`;
      const mimeType = "audio/mp4";

      // Passo 1: Criar mensagem com status PROCESSING
      // O socket vai receber message_created e adicionar à lista automaticamente
      const { data: backendMessage } =
        await messagesService.prepareMediaMessage(
          ticket.id,
          fileName,
          mimeType,
          0, // Não temos o tamanho exato do áudio
          undefined
        );

      // Passo 2: Completar upload em background (não bloqueia a UI)
      messagesService
        .completeMediaUpload(
          backendMessage.id,
          uri,
          fileName,
          mimeType,
          undefined,
          (progress) => setUploadProgress(progress)
        )
        .catch((error) => {
          console.error("Erro ao completar upload do áudio:", error);
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== backendMessage.id)
          );
          Alert.alert("Erro", "Não foi possível enviar o áudio");
        });
    } catch (error: any) {
      console.error("Erro ao enviar áudio:", error);
      Alert.alert("Erro", "Não foi possível enviar o áudio");
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), "HH:mm");
  };

  const renderMessageStatus = (status: string) => {
    const isRead = status === "READ";
    const color = isRead ? "#3b82f6" : "#6b7280";

    if (status === "PENDING") {
      return <Text style={[styles.messageStatus, { color }]}>🕐</Text>;
    }

    if (status === "SENT") {
      return <Text style={[styles.messageStatus, { color }]}>✓</Text>;
    }

    // DELIVERED e READ - dois checks sobrepostos
    return (
      <View style={styles.doubleCheckContainer}>
        <Text style={[styles.doubleCheck, styles.doubleCheckFirst, { color }]}>
          ✓
        </Text>
        <Text style={[styles.doubleCheck, styles.doubleCheckSecond, { color }]}>
          ✓
        </Text>
      </View>
    );
  };

  const URL_REGEX = /(https?:\/\/[^\s]+)/g;

  const renderTextWithLinks = (text: string, textColor: string) => {
    const parts = text.split(URL_REGEX);
    if (parts.length === 1) {
      return (
        <Text style={[styles.messageText, { color: textColor }]}>{text}</Text>
      );
    }

    return (
      <Text style={[styles.messageText, { color: textColor }]}>
        {parts.map((part, index) => {
          if (URL_REGEX.test(part)) {
            // Reset lastIndex pois regex com /g mantém estado
            URL_REGEX.lastIndex = 0;
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => Linking.openURL(part)}
              >
                {part}
              </Text>
            );
          }
          // Reset lastIndex
          URL_REGEX.lastIndex = 0;
          return part;
        })}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isFromMe = item.fromMe;
    const isSystemMessage = item.type === "SYSTEM";
    const isWhisper = item.isWhisper;

    // Placeholder para mídia em upload (status PROCESSING sem mediaUrl)
    if (item.status === "PROCESSING" && !item.mediaUrl) {
      const mediaTypeLabel =
        item.type === "VIDEO"
          ? "vídeo"
          : item.type === "IMAGE"
          ? "imagem"
          : item.type === "AUDIO"
          ? "áudio"
          : "arquivo";

      return (
        <View style={[styles.messageContainer, styles.messageFromMe]}>
          <View style={styles.uploadingMessageBubble}>
            <ActivityIndicator
              size="small"
              color="#3b82f6"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.uploadingMessageText}>
              Enviando {mediaTypeLabel}...
            </Text>
            {item.fileName && (
              <Text style={styles.uploadingMessageFileName} numberOfLines={1}>
                {item.fileName}
              </Text>
            )}
          </View>
        </View>
      );
    }

    // Mensagem do sistema (centralizada)
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessageBubble}>
            <View style={styles.systemMessageHeader}>
              <Text style={styles.systemMessageIcon}>ℹ️</Text>
              <Text style={styles.systemMessageLabel}>Sistema</Text>
            </View>
            <Text style={styles.systemMessageText}>{item.content}</Text>
            <Text style={styles.systemMessageTime}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>
        </View>
      );
    }

    // Mensagem de áudio
    if (item.type === "AUDIO" && item.mediaUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isFromMe ? styles.messageFromMe : styles.messageFromContact,
          ]}
        >
          <AudioPlayer
            audioUrl={item.mediaUrl}
            messageId={item.id}
            isFromMe={isFromMe}
          />
        </View>
      );
    }

    // Mensagem com imagem
    if (item.type === "IMAGE" && item.mediaUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isFromMe ? styles.messageFromMe : styles.messageFromContact,
          ]}
        >
          <TouchableOpacity
            onPress={() => setSelectedImage(item.mediaUrl || null)}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.imageMessageContainer,
                isFromMe ? styles.bubbleFromMe : styles.bubbleFromContact,
              ]}
            >
              <Image
                source={{ uri: item.mediaUrl }}
                style={styles.messageImage}
                resizeMode="cover"
              />
              {item.content &&
                item.content !== "[Imagem]" &&
                renderTextWithLinks(
                  item.content,
                  isFromMe ? "#111827" : "#ffffff"
                )}
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    { color: isFromMe ? "#6b7280" : "#93c5fd" },
                  ]}
                >
                  {formatMessageTime(item.timestamp)}
                </Text>
                {isFromMe && item.status && renderMessageStatus(item.status)}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Mensagem com vídeo
    if (item.type === "VIDEO" && item.mediaUrl) {
      return (
        <View
          style={[
            styles.messageContainer,
            isFromMe ? styles.messageFromMe : styles.messageFromContact,
          ]}
        >
          <View
            style={[
              styles.videoMessageContainer,
              isFromMe ? styles.bubbleFromMe : styles.bubbleFromContact,
            ]}
          >
            <Video
              source={{ uri: item.mediaUrl }}
              style={styles.messageVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
            {item.content &&
              item.content !== "[Vídeo]" &&
              renderTextWithLinks(
                item.content,
                isFromMe ? "#111827" : "#ffffff"
              )}
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  { color: isFromMe ? "#6b7280" : "#93c5fd" },
                ]}
              >
                {formatMessageTime(item.timestamp)}
              </Text>
              {isFromMe && item.status && renderMessageStatus(item.status)}
            </View>
          </View>
        </View>
      );
    }

    // Mensagem de contato (vCard)
    if (item.type === "CONTACT") {
      return (
        <View
          style={[
            styles.messageContainer,
            isFromMe ? styles.messageFromMe : styles.messageFromContact,
          ]}
        >
          <View>
            <ContactMessage content={item.content} isFromMe={isFromMe} />
            <View style={[styles.messageFooter, { marginTop: 4 }]}>
              <Text
                style={[
                  styles.messageTime,
                  { color: isFromMe ? "#6b7280" : "#93c5fd" },
                ]}
              >
                {formatMessageTime(item.timestamp)}
              </Text>
              {isFromMe && item.status && renderMessageStatus(item.status)}
            </View>
          </View>
        </View>
      );
    }

    // Mensagem de documento
    if (item.type === "DOCUMENT" && item.mediaUrl && item.fileName) {
      return (
        <View
          style={[
            styles.messageContainer,
            isFromMe ? styles.messageFromMe : styles.messageFromContact,
          ]}
        >
          <View>
            <DocumentMessage
              fileName={item.fileName}
              mediaUrl={item.mediaUrl}
              isFromMe={isFromMe}
            />
            <View style={[styles.messageFooter, { marginTop: 4 }]}>
              <Text
                style={[
                  styles.messageTime,
                  { color: isFromMe ? "#6b7280" : "#93c5fd" },
                ]}
              >
                {formatMessageTime(item.timestamp)}
              </Text>
              {isFromMe && item.status && renderMessageStatus(item.status)}
            </View>
          </View>
        </View>
      );
    }

    // Mensagem normal
    return (
      <View
        style={[
          styles.messageContainer,
          isFromMe ? styles.messageFromMe : styles.messageFromContact,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isFromMe ? styles.bubbleFromMe : styles.bubbleFromContact,
            isWhisper && styles.whisperBubble,
          ]}
        >
          {isWhisper && (
            <View style={styles.whisperLabelRow}>
              <Feather name="message-square" size={13} color="#7c3aed" />
              <Text style={styles.whisperLabel}>Sussurro interno</Text>
            </View>
          )}
          {renderTextWithLinks(
            item.content,
            isWhisper ? "#7c3aed" : isFromMe ? "#111827" : "#ffffff"
          )}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                { color: isFromMe ? "#6b7280" : "#93c5fd" },
              ]}
            >
              {formatMessageTime(item.timestamp)}
            </Text>
            {isFromMe && item.status && renderMessageStatus(item.status)}
          </View>
        </View>
      </View>
    );
  };

  const Container = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const containerProps = Platform.OS === 'ios'
    ? { style: styles.container, behavior: 'padding' as const, keyboardVerticalOffset: 0 }
    : { style: [styles.container, androidKeyboardHeight > 0 && { paddingBottom: androidKeyboardHeight+30 }] };

  return (
    <Fragment>
      <Container {...containerProps}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Avatar do contato */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() =>
              ticket.contact.profilePicture && setShowProfilePicture(true)
            }
            disabled={!ticket.contact.profilePicture}
          >
            {ticket.contact.profilePicture ? (
              <Image
                source={{ uri: ticket.contact.profilePicture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {ticket.contact.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.contactName}>{ticket.contact.name}</Text>
            <Text style={styles.contactPhone}>{ticket.contact.phone}</Text>
          </View>

          {/* Botao de Transferir */}
          <TouchableOpacity
            style={styles.transferButton}
            onPress={() => setShowTransferModal(true)}
          >
            <View style={styles.transferIconContainer}>
              <View style={styles.transferUserIcon}>
                <View style={styles.transferUserHead} />
                <View style={styles.transferUserBody} />
              </View>
              <Text style={styles.transferArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            onScroll={handleScroll}
            scrollEventThrottle={400}
            onContentSizeChange={handleContentSizeChange}
            ListHeaderComponent={
              loadingMore ? (
                <ActivityIndicator
                  size="small"
                  color="#8b5cf6"
                  style={styles.loadingMore}
                />
              ) : null
            }
            contentContainerStyle={styles.messagesList}
          />
        )}

        {/* Input Area */}
        {ticket.status === "OPEN" ? (
          <View
            style={[
              styles.inputWrapper,
              {
                paddingBottom: keyboardVisible
                  ? 0
                  : Math.max(12, insets.bottom),
              },
            ]}
          >
            {/* Linha de ações: Config + Attach */}
            <View style={[styles.topRow, isRecording && { opacity: 0.4 }]}>
              <TouchableOpacity
                style={[
                  styles.topRowButton,
                  (uploadingMedia || isRecording) && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (uploadingMedia) {
                    Alert.alert(
                      "Aguarde",
                      "Já existe um arquivo sendo enviado"
                    );
                    return;
                  }
                  setShowAttachModal(true);
                }}
                disabled={isRecording}
              >
                <Feather name="paperclip" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.topRowButton}
                onPress={() => setShowConfigModal(true)}
                disabled={isRecording}
              >
                <Feather name="settings" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.topRowButton}
                onPress={() => setShowQuickRepliesModal(true)}
                disabled={isRecording}
              >
                <Feather name="hash" size={20} color="#666" />
              </TouchableOpacity>
              
              {isOfficialConnection && (
                <TouchableOpacity
                style={styles.topRowButton}
                onPress={() => setShowTemplateModal(true)}
                disabled={isRecording}
                >
                  <Feather name="file-text" size={20} color="#666" />
                </TouchableOpacity>
              )}

            </View>

            {/* Upload progress - barra de progresso detalhada */}
            {uploadingMedia && (
              <View style={styles.uploadingContainer}>
                {/* Mensagem de status atual */}
                <View style={styles.uploadingHeader}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text style={styles.uploadingText}>
                    {uploadStage?.stage === "error"
                      ? `❌ ${uploadStage.message}`
                      : uploadStage?.stage === "completed"
                      ? `✅ ${uploadStage.message}`
                      : uploadStage?.message || "Enviando arquivo..."}
                  </Text>
                  <Text style={styles.uploadingProgress}>
                    {uploadStage?.progress ?? uploadProgress}%
                  </Text>
                </View>

                {/* Indicadores de etapas */}
                <View style={styles.uploadingStages}>
                  <View style={styles.uploadingStage}>
                    <Text
                      style={[
                        styles.uploadingStageIcon,
                        (uploadStage?.progress ?? uploadProgress) > 10
                          ? styles.uploadingStageCompleted
                          : uploadStage?.stage === "uploading"
                          ? styles.uploadingStageActive
                          : styles.uploadingStagePending,
                      ]}
                    >
                      {(uploadStage?.progress ?? uploadProgress) > 10
                        ? "✓"
                        : "○"}
                    </Text>
                    <Text style={styles.uploadingStageText}>Recebendo</Text>
                  </View>

                  <View style={styles.uploadingStageLine} />

                  <View style={styles.uploadingStage}>
                    <Text
                      style={[
                        styles.uploadingStageIcon,
                        (uploadStage?.progress ?? 0) >= 50
                          ? styles.uploadingStageCompleted
                          : uploadStage?.stage === "s3_uploading" ||
                            uploadStage?.stage === "s3_completed"
                          ? styles.uploadingStageActive
                          : styles.uploadingStagePending,
                      ]}
                    >
                      {(uploadStage?.progress ?? 0) >= 50 ? "✓" : "○"}
                    </Text>
                    <Text style={styles.uploadingStageText}>Armazenando</Text>
                  </View>

                  <View style={styles.uploadingStageLine} />

                  <View style={styles.uploadingStage}>
                    <Text
                      style={[
                        styles.uploadingStageIcon,
                        (uploadStage?.progress ?? 0) >= 90
                          ? styles.uploadingStageCompleted
                          : uploadStage?.stage === "whatsapp_sending"
                          ? styles.uploadingStageActive
                          : styles.uploadingStagePending,
                      ]}
                    >
                      {(uploadStage?.progress ?? 0) >= 90 ? "✓" : "○"}
                    </Text>
                    <Text style={styles.uploadingStageText}>Enviando</Text>
                  </View>

                  <View style={styles.uploadingStageLine} />

                  <View style={styles.uploadingStage}>
                    <Text
                      style={[
                        styles.uploadingStageIcon,
                        uploadStage?.stage === "completed"
                          ? styles.uploadingStageCompleted
                          : uploadStage?.stage === "error"
                          ? styles.uploadingStageError
                          : styles.uploadingStagePending,
                      ]}
                    >
                      {uploadStage?.stage === "completed"
                        ? "✓"
                        : uploadStage?.stage === "error"
                        ? "✗"
                        : "○"}
                    </Text>
                    <Text style={styles.uploadingStageText}>Concluído</Text>
                  </View>
                </View>

                {/* Barra de progresso */}
                <View style={styles.uploadingProgressBar}>
                  <View
                    style={[
                      styles.uploadingProgressFill,
                      {
                        width: `${uploadStage?.progress ?? uploadProgress}%`,
                        backgroundColor:
                          uploadStage?.stage === "error"
                            ? "#ef4444"
                            : uploadStage?.stage === "completed"
                            ? "#22c55e"
                            : "#8b5cf6",
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {isRecording ? (
              /* Barra de gravação de áudio */
              <View style={styles.recordingBar}>
                <TouchableOpacity
                  onPress={handleCancelRecording}
                  style={styles.recordingCancelButton}
                >
                  <Text style={styles.recordingCancelText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTimeText}>
                    {formatRecordingTime(recordingTime)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleSendRecording}
                  style={styles.recordingSendButton}
                >
                  <Text style={styles.recordingSendText}>Enviar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Input de mensagem normal */
              <View style={styles.inputContainer}>

                <TouchableOpacity
                  style={styles.emojiButton}
                  onPress={() => setShowEmojiPicker(true)}
                >
                  <Text style={styles.emojiButtonText}>😊</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  maxLength={4096}
                />

                {messageText.trim() ? (
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      sending && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.sendButtonText}>➤</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.micButton}
                    onPress={handleStartRecording}
                  >
                    <Text style={styles.micButtonText}>🎤</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          <View
            style={[
              styles.inputContainer,
              styles.inputContainerDisabled,
              {
                paddingBottom: keyboardVisible
                  ? 0
                  : Math.max(12, insets.bottom),
              },
            ]}
          >
            <Text style={styles.inputDisabledText}>
              {ticket.status === "PENDING"
                ? "Ticket aguardando atendimento"
                : "Ticket encerrado"}
            </Text>
          </View>
        )}

        {/* Modal de visualização da foto do perfil */}
        <Modal
          visible={showProfilePicture}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProfilePicture(false)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setShowProfilePicture(false)}
            >
              <Text style={styles.imageViewerCloseText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageViewerContent}
              activeOpacity={1}
              onPress={() => setShowProfilePicture(false)}
            >
              {ticket.contact.profilePicture && (
                <Image
                  source={{ uri: ticket.contact.profilePicture }}
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal de anexo */}
        <AttachModal
          visible={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          onTakePhoto={handleTakePhoto}
          onRecordVideo={handleRecordVideo}
          onPickImage={handlePickImage}
          onPickDocument={handlePickDocument}
        />

        {/* Modal de Respostas Rápidas */}
        <QuickRepliesModal
          visible={showQuickRepliesModal}
          onClose={() => setShowQuickRepliesModal(false)}
          onSelect={(message) => {
            setMessageText(message);
            setShowQuickRepliesModal(false);
          }}
        />

        {/* Modal de Configurações */}
        <ChatConfigModal
          visible={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          signatureEnabled={signatureEnabled}
          onSignatureToggle={handleSignatureToggle}
          whisperMode={whisperMode}
          onWhisperToggle={handleWhisperToggle}
          user={user ? { name: user.name, type: user.type } : null}
        />

        <SendTemplateModal
          visible={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          ticketId={ticket.id}
          connectionId={ticket.connectionId}
          contactName={'ALESSANDRO - TESTE'}
          onSuccess={()=>{}}
        />

        {/* Modal de visualização de imagem da mensagem */}
        <Modal
          visible={selectedImage !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.imageViewerCloseText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageViewerContent}
              activeOpacity={1}
              onPress={() => setSelectedImage(null)}
            >
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </Modal>

        {/* Modal de Transferencia de Ticket */}
        <TransferTicketModal
          visible={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          ticket={ticket}
          onTransferSuccess={() => {
            setShowTransferModal(false);
            navigation.goBack();
          }}
        />
      </Container>

      <EmojiPicker
        onEmojiSelected={(emoji) => {
          setMessageText((prev) => prev + emoji.emoji);
        }}
        open={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        translation={{
          search: "Pesquisar",
          categories: {
            recently_used: "Recentes",
            smileys_emotion: "Smileys",
            people_body: "Pessoas",
            animals_nature: "Animais",
            food_drink: "Comida",
            travel_places: "Viagem",
            activities: "Atividades",
            objects: "Objetos",
            symbols: "Símbolos",
            flags: "Bandeiras",
          },
        }}
      />
    </Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 28,
    color: "#3b82f6",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6b7280",
  },
  headerInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  contactPhone: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  transferButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  transferIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  transferUserIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  transferUserHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8b5cf6",
  },
  transferUserBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#8b5cf6",
    marginTop: 2,
  },
  transferArrow: {
    fontSize: 14,
    color: "#8b5cf6",
    fontWeight: "bold",
    marginLeft: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  messageFromMe: {
    alignSelf: "flex-end",
  },
  messageFromContact: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bubbleFromMe: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  bubbleFromContact: {
    backgroundColor: "#4d4c57",
  },
  whisperBubble: {
    backgroundColor: "#f5f3ff",
    borderColor: "#c4b5fd",
  },
  whisperLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  whisperLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7c3aed",
  },
  imageMessageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  videoMessageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  messageVideo: {
    width: 250,
    height: 180,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: "#000000",
  },
  messageText: {
    fontSize: 15,
  },
  linkText: {
    color: "#60a5fa",
    textDecorationLine: "underline",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageStatus: {
    fontSize: 12,
  },
  doubleCheckContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 14,
    width: 16,
  },
  doubleCheck: {
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 14,
  },
  doubleCheckFirst: {
    position: "absolute",
    left: 0,
  },
  doubleCheckSecond: {
    position: "absolute",
    left: 5,
  },
  inputWrapper: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
  },
  topRowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  inputContainerDisabled: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  inputDisabledText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: "#8b5cf6",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  loadingMore: {
    marginVertical: 16,
  },
  // Estilos para mensagens do sistema
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  systemMessageBubble: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "80%",
    alignItems: "center",
  },
  systemMessageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  systemMessageIcon: {
    fontSize: 14,
  },
  systemMessageLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d97706",
  },
  systemMessageText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
    marginBottom: 4,
  },
  systemMessageTime: {
    fontSize: 11,
    color: "#d97706",
    marginTop: 2,
  },
  // Estilos para o modal de visualização de imagem
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerCloseText: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "bold",
  },
  imageViewerContent: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "100%",
  },
  emojiButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiButtonText: {
    fontSize: 22,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  micButtonText: {
    fontSize: 20,
  },
  uploadingContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  uploadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  uploadingText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  uploadingProgress: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  uploadingStages: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  uploadingStage: {
    alignItems: "center",
  },
  uploadingStageIcon: {
    fontSize: 12,
    marginBottom: 2,
  },
  uploadingStageText: {
    fontSize: 10,
    color: "#6b7280",
  },
  uploadingStagePending: {
    color: "#9ca3af",
  },
  uploadingStageActive: {
    color: "#8b5cf6",
    fontWeight: "600",
  },
  uploadingStageCompleted: {
    color: "#22c55e",
  },
  uploadingStageError: {
    color: "#ef4444",
  },
  uploadingStageLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#d1d5db",
    marginHorizontal: 4,
  },
  uploadingProgressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  uploadingProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    gap: 12,
  },
  recordingCancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  recordingTimeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
  recordingSendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#8b5cf6",
  },
  recordingSendText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  // Estilos para placeholder de upload na mensagem
  uploadingMessageBubble: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 180,
  },
  uploadingMessageText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },
  uploadingMessageFileName: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    maxWidth: 150,
  },
});
