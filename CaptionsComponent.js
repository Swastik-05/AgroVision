import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Translation map for labels
const translations = {
  en: {
    panelTitle: 'Crop Analysis',
    waitingText: 'Waiting for commands...',
    fullscreen: 'fullscreen',
    exit: 'fullscreen-exit',
  },
  hi: {
    panelTitle: 'फसल विश्लेषण',
    waitingText: 'आदेशों की प्रतीक्षा हो रही है...',
    fullscreen: 'fullscreen',
    exit: 'fullscreen-exit',
  },
};

const CaptionsComponent = ({ text, onToggleFullScreen, isFullScreen, language = 'en' }) => {
  const t = translations[language] || translations.en;

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      style={[styles.panel, isFullScreen && styles.fullScreenPanel]}
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
          <Text style={[styles.chatText, isFullScreen && { fontSize: 24 }]}>
            {text || t.waitingText}
          </Text>
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
  fullScreenPanel: {
    flex: 1,
    padding: 30,
  },
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
  chatText: {
    fontSize: 16,
    color: '#1B5E20',
    lineHeight: 24,
  },
});

export default CaptionsComponent;