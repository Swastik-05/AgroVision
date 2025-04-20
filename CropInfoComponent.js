import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Translation map for labels
const translations = {
  en: {
    panelTitle: 'Type of Crop',
    cropLabel: 'Crop:',
    currentMoisture: 'Current Moisture Level:',
    requiredMoisture: 'Required Moisture Level:',
    irrigation: 'Irrigation',
    irrigationRequired: 'Irrigation Required',
    irrigationNotRequired: 'Irrigation Not Required',
    snakePlant: 'Snake Plant',
    asparagusFern: 'Asparagus Fern',
    wheat: 'Wheat',
    fullscreen: 'fullscreen',
    exit: 'fullscreen-exit',
  },
  hi: {
    panelTitle: 'फसल का प्रकार',
    cropLabel: 'फसल:',
    currentMoisture: 'वर्तमान नमी स्तर:',
    requiredMoisture: 'आवश्यक नमी स्तर:',
    irrigation: 'सिंचाई',
    irrigationRequired: 'सिंचाई आवश्यक',
    irrigationNotRequired: 'सिंचाई की आवश्यकता नहीं',
    snakePlant: 'स्नेक प्लांट',
    asparagusFern: 'एस्पैरागस फर्न',
    wheat: 'गेहूं',
    fullscreen: 'fullscreen',
    exit: 'fullscreen-exit',
  },
};

const CropInfoComponent = ({ data, onToggleFullScreen, isFullScreen, language = 'en' }) => {
  const t = translations[language] || translations.en;

  // Translate crop type and irrigation based on language
  const translatedType = data.type === 'Snake Plant' ? t.snakePlant :
                        data.type === 'Asparagus Fern' ? t.asparagusFern :
                        data.type === 'Wheat' ? t.wheat : data.type;
  const translatedIrrigation = data.irrigation === 'Irrigation Required' ? t.irrigationRequired :
                              data.irrigation === 'Irrigation Not Required' ? t.irrigationNotRequired :
                              data.irrigation;

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
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isFullScreen && { fontSize: 20 }]}>
              {t.cropLabel}
            </Text>
            <Text style={[styles.infoValue, isFullScreen && { fontSize: 20 }]}>
              {translatedType}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isFullScreen && { fontSize: 20 }]}>
              {t.currentMoisture}
            </Text>
            <Text style={[styles.infoValue, isFullScreen && { fontSize: 20 }]}>
              {data.currentMoisture}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isFullScreen && { fontSize: 20 }]}>
              {t.requiredMoisture}
            </Text>
            <Text style={[styles.infoValue, isFullScreen && { fontSize: 20 }]}>
              {data.requiredMoisture}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isFullScreen && { fontSize: 20 }]}>
              {t.irrigation}
            </Text>
            <Text
              style={[
                styles.infoValue,
                isFullScreen && { fontSize: 40 },
                {
                  color:
                    data.irrigation === 'Irrigation Required' || translatedIrrigation === t.irrigationRequired
                      ? '#D32F2F'
                      : data.irrigation === 'Irrigation Not Required' || translatedIrrigation === t.irrigationNotRequired
                      ? '#2E7D32'
                      : '#000000',
                },
              ]}
            >
              {translatedIrrigation}
            </Text>
          </View>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#1B5E20',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

export default CropInfoComponent;