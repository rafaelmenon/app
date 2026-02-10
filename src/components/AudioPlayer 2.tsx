import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

interface AudioPlayerProps {
  audioUrl: string;
  isFromMe: boolean;
}

export function AudioPlayer({ audioUrl, isFromMe }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Erro ao carregar áudio:', error);
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

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.container, isFromMe ? styles.containerFromMe : styles.containerFromContact]}>
      <TouchableOpacity
        style={[styles.playButton, isFromMe ? styles.playButtonFromMe : styles.playButtonFromContact]}
        onPress={togglePlayPause}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isFromMe ? '#3b82f6' : '#ffffff'} />
        ) : (
          <Text style={[styles.playIcon, { color: isFromMe ? '#3b82f6' : '#ffffff' }]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <View style={styles.waveformContainer}>
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
        <Text style={[styles.duration, { color: isFromMe ? '#6b7280' : '#93c5fd' }]}>
          {formatTime(position)} / {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 250,
  },
  containerFromMe: {
    backgroundColor: '#f3f4f6',
  },
  containerFromContact: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playButtonFromMe: {
    backgroundColor: '#dbeafe',
  },
  playButtonFromContact: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  playIcon: {
    fontSize: 16,
  },
  infoContainer: {
    flex: 1,
  },
  waveformContainer: {
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFromMe: {
    backgroundColor: '#e5e7eb',
  },
  progressBarFromContact: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
  progressFromMe: {
    backgroundColor: '#3b82f6',
  },
  progressFromContact: {
    backgroundColor: '#ffffff',
  },
  duration: {
    fontSize: 12,
  },
});
