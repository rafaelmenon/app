import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { transcriptionService } from '../services/transcription';

interface AudioPlayerProps {
  audioUrl: string;
  messageId: string;
  isFromMe: boolean;
}

export function AudioPlayer({ audioUrl, messageId, isFromMe }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionLoaded, setTranscriptionLoaded] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    const loadExistingTranscription = async () => {
      if (!messageId || transcriptionLoaded) return;

      try {
        const existingTranscription = await transcriptionService.getTranscription(messageId);
        if (existingTranscription) {
          setTranscription(existingTranscription);
        }
      } catch (err) {
        console.error('Erro ao carregar transcrição existente:', err);
      } finally {
        setTranscriptionLoaded(true);
      }
    };

    loadExistingTranscription();
  }, [messageId, transcriptionLoaded]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setError(false);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Erro ao carregar áudio:', error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const togglePlayPause = async () => {
    if (!sound) {
      await loadAudio();
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const handleTranscribe = async () => {
    if (isTranscribing || transcription) return;

    try {
      setIsTranscribing(true);
      const result = await transcriptionService.transcribeAudio(messageId);

      if (result.success && result.transcription) {
        setTranscription(result.transcription);
      }
    } catch (err) {
      console.error('Erro ao transcrever áudio:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View>
      <View style={[styles.container, isFromMe ? styles.containerFromMe : styles.containerFromContact]}>
        <TouchableOpacity
          style={[styles.playButton, isFromMe ? styles.playButtonFromMe : styles.playButtonFromContact, error && styles.playButtonError]}
          onPress={error ? () => { setError(false); loadAudio(); } : togglePlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : error ? (
            <Text style={[styles.playIcon, { color: '#ffffff' }]}>↻</Text>
          ) : (
            <Text style={[styles.playIcon, { color: '#ffffff' }]}>
              {isPlaying ? '⏸' : '▶'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, isFromMe ? styles.progressBarFromMe : styles.progressBarFromContact]}>
              <View
                style={[
                  styles.progress,
                  { width: `${progress}%` },
                  isFromMe ? styles.progressFromMe : styles.progressFromContact,
                ]}
              />
            </View>
          </View>
          <Text style={[styles.duration, { color: isFromMe ? '#6b7280' : '#d1d5db' }]}>
            {error ? 'Erro ao carregar' : `${formatTime(position)} / ${formatTime(duration)}`}
          </Text>
        </View>
      </View>

      {!transcription && !isTranscribing && transcriptionLoaded && (
        <TouchableOpacity
          style={[styles.transcribeButton, isFromMe ? styles.transcribeButtonFromMe : styles.transcribeButtonFromContact]}
          onPress={handleTranscribe}
        >
          <Text style={[styles.transcribeButtonText, isFromMe ? styles.transcribeButtonTextFromMe : styles.transcribeButtonTextFromContact]}>
            Transcrever áudio
          </Text>
        </TouchableOpacity>
      )}

      {isTranscribing && (
        <View style={[styles.transcriptionContainer, isFromMe ? styles.transcriptionContainerFromMe : styles.transcriptionContainerFromContact]}>
          <View style={styles.transcribingRow}>
            <ActivityIndicator size="small" color={isFromMe ? '#3b82f6' : '#ffffff'} />
            <Text style={[styles.transcribingText, { color: isFromMe ? '#6b7280' : '#d1d5db' }]}>
              Transcrevendo...
            </Text>
          </View>
        </View>
      )}

      {transcription && (
        <View style={[styles.transcriptionContainer, isFromMe ? styles.transcriptionContainerFromMe : styles.transcriptionContainerFromContact]}>
          <Text style={[styles.transcriptionLabel, { color: isFromMe ? '#6b7280' : '#d1d5db' }]}>
            Transcrição
          </Text>
          <Text style={[styles.transcriptionText, { color: isFromMe ? '#374151' : '#ffffff' }]}>
            {transcription}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 220,
    maxWidth: 280,
  },
  containerFromMe: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  containerFromContact: {
    backgroundColor: '#4d4c57',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playButtonFromMe: {
    backgroundColor: '#3b82f6',
  },
  playButtonFromContact: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  playButtonError: {
    backgroundColor: '#ef4444',
  },
  playIcon: {
    fontSize: 18,
    marginLeft: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBarContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFromMe: {
    backgroundColor: '#e5e7eb',
  },
  progressBarFromContact: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  progress: {
    height: '100%',
    borderRadius: 3,
  },
  progressFromMe: {
    backgroundColor: '#60a5fa',
  },
  progressFromContact: {
    backgroundColor: '#ffffff',
  },
  duration: {
    fontSize: 11,
    fontWeight: '500',
  },
  transcribeButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  transcribeButtonFromMe: {
    backgroundColor: 'transparent',
    borderColor: '#3b82f6',
  },
  transcribeButtonFromContact: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  transcribeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transcribeButtonTextFromMe: {
    color: '#3b82f6',
  },
  transcribeButtonTextFromContact: {
    color: '#ffffff',
  },
  transcriptionContainer: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    maxWidth: 280,
  },
  transcriptionContainerFromMe: {
    backgroundColor: '#f3f4f6',
    borderLeftColor: '#3b82f6',
  },
  transcriptionContainerFromContact: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftColor: '#ffffff',
  },
  transcriptionLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  transcriptionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  transcribingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcribingText: {
    fontSize: 12,
    marginLeft: 8,
  },
});
