import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface AttachModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onRecordVideo: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
}

export function AttachModal({
  visible,
  onClose,
  onTakePhoto,
  onRecordVideo,
  onPickImage,
  onPickDocument,
}: AttachModalProps) {
  const handleOption = (action: () => void) => {
    onClose();
    setTimeout(() => {
      action();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Feather name="paperclip" size={20} color="#666" />
              <Text style={styles.title}>Anexar</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOption(onTakePhoto)}
          >
            <Text style={styles.optionText}>📷 Tirar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOption(onRecordVideo)}
          >
            <Text style={styles.optionText}>🎥 Gravar Vídeo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOption(onPickImage)}
          >
            <Text style={styles.optionText}>🖼️ Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.option, styles.optionLast]}
            onPress={() => handleOption(onPickDocument)}
          >
            <Text style={styles.optionText}>📄 Documento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1f2937",
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
  },
  cancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
    textAlign: "center",
  },
});
