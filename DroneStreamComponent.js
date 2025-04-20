import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Translation map for labels
const translations = {
  en: {
    panelTitle: 'Drone Feed',
    loadingText: 'Establishing connection...',
    placeholderText: 'Waiting for stream...',
    fullscreen: 'fullscreen',
    exit: 'fullscreen-exit',
  },
  hi: {
    panelTitle: 'ड्रोन फीड',
    loadingText: 'कनेक्शन स्थापित हो रहा है...',
    placeholderText: 'स्ट्रीम की प्रतीक्षा हो रही है...',
    fullscreen: 'fullscreen',
    exit: 'fullscreen-exit',
  },
};

const DroneStreamComponent = ({ feed, onToggleFullScreen, isFullScreen, language = 'en' }) => {
  const [streamUrl, setStreamUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const imageRef = useRef(null);
  const [renderKey, setRenderKey] = useState(0);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const t = translations[language] || translations.en;

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Lock orientation for fullscreen
  useEffect(() => {
    if (isFullScreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, [isFullScreen]);

  // WebSocket for drone feed
  useEffect(() => {
    if (!isFullScreen) return;

    const connectWebSocket = () => {
      const wsUrl = 'ws://192.168.43.183:3007';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'blob';

      ws.onopen = () => {
        console.log('Drone WebSocket connected to ws://192.168.43.183:3007');
        setStreamReady(true);
        setError(null);
        setIsLoading(false);
      };

      ws.onmessage = (event) => {
        console.log('Received WebSocket message, data type:', typeof event.data, 'size:', event.data.size);
        if (imageRef.current) {
          const blob = event.data;
          const url = URL.createObjectURL(blob);
          setStreamUrl(url);
          setRenderKey(prev => prev + 1);
          setTimeout(() => URL.revokeObjectURL(url), 100);
        } else {
          console.log('imageRef.current is null, component not mounted yet');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStreamReady(false);
        setError('Failed to connect to stream');
        setIsLoading(false);
      };

      ws.onclose = (event) => {
        console.log('Drone WebSocket closed, code:', event.code, 'reason:', event.reason);
        setStreamReady(false);
        setError('Disconnected from stream');
        setIsLoading(false);
        if (isFullScreen) {
          setTimeout(connectWebSocket, 2000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [isFullScreen]);

  const imageHeight = isFullScreen ? dimensions.height : dimensions.width * 0.5625; // 16:9 aspect ratio

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      style={[styles.panel, isFullScreen && styles.fullScreenPanel(dimensions)]}
    >
      <TouchableOpacity style={styles.fullScreenButton} onPress={onToggleFullScreen}>
        <MaterialCommunityIcons
          name={isFullScreen ? t.exit : t.fullscreen}
          size={24}
          color="#2E7D32"
        />
      </TouchableOpacity>
      <View style={styles.gradientWrapper}>
        <LinearGradient colors={['#FFFFFF', '#E8F5E9']} style={styles.gradient}>
          <Text style={styles.panelTitle}>{t.panelTitle}</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>{t.loadingText}</Text>
            </View>
          ) : streamReady && streamUrl ? (
            <Image
              key={renderKey}
              ref={imageRef}
              source={{ uri: streamUrl }}
              style={[isFullScreen ? styles.fullScreenImage : styles.image, { height: imageHeight }]}
              resizeMode="contain"
              onError={(error) => {
                console.error('Image error:', error.nativeEvent.error);
                setError('Image load failed');
              }}
              onLoadStart={() => console.log('Image load started')}
              onLoad={() => console.log('Image loaded')}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.placeholderText}>
                {error || t.placeholderText}
              </Text>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}
        </LinearGradient>
      </View>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: 15,
    marginBottom: 20,
    position: 'relative',
    elevation: 5,
    overflow: 'hidden',
  },
  fullScreenPanel: (dimensions) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: dimensions.width,
    height: dimensions.height,
    zIndex: 100,
    backgroundColor: 'black',
  }),
  gradientWrapper: {
    overflow: 'hidden',
    borderRadius: 15,
  },
  gradient: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  fullScreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 8,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    borderRadius: 10,
  },
  fullScreenImage: {
    width: '100%',
    borderRadius: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#2E7D32',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  placeholderText: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
  },
});

export default DroneStreamComponent;