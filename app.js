import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebSocket from 'reconnecting-websocket';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EyesComponent from './components/EyesComponent';
import DroneStreamComponent from './components/DroneStreamComponent';
import CaptionsComponent from './components/CaptionsComponent';
import CropInfoComponent from './components/CropInfoComponent';
import { useWebSocket } from './hooks/useWebSocket';


const translations = {
  en: {
    appTitle: 'Agro-vision',
    hindiButton: 'Click for Hindi',
    irrigationRequired: 'Irrigation Required',
    irrigationNotRequired: 'Irrigation Not Required',
    snakePlant: 'Snake Plant',
    asparagusFern: 'Asparagus Fern',
    wheat: 'Wheat',
    waiting: 'Waiting for commands...',
    analyzing: 'Analyzing crop...',
    detected: 'Crop detected: ',
  },
  hi: {
    appTitle: 'एग्रो-विजन',
    hindiButton: 'अंग्रेजी के लिए क्लिक करें',
    irrigationRequired: 'सिंचाई आवश्यक',
    irrigationNotRequired: 'सिंचाई की आवश्यकता नहीं',
    snakePlant: 'स्नेक प्लांट',
    asparagusFern: 'एस्पैरागस फर्न',
    wheat: 'गेहूं',
    waiting: 'आदेशों की प्रतीक्षा हो रही है...',
    analyzing: 'फसल का विश्लेषण हो रहा है...',
    detected: 'फसल का पता चला: ',
  },
};

const Header = ({ language = 'en' }) => {
  const t = translations[language] || translations.en;
  return (
    <View style={headerStyles.container}>
      <MaterialCommunityIcons name="leaf" size={30} color="#2E7D32" style={headerStyles.icon} />
      <Text style={headerStyles.title}>{t.appTitle}</Text>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F0F4F0',
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

const App = () => {
  const [eyesOpen, setEyesOpen] = useState(false);
  const [showMainScreen, setShowMainScreen] = useState(false); 
  const [droneFeed, setDroneFeed] = useState('https://via.placeholder.com/300x200?text=Drone+Feed');
  const [captions, setCaptions] = useState('Waiting for commands...');
  const [cropData, setCropData] = useState({
    type: 'N/A',
    currentMoisture: 'N/A',
    requiredMoisture: 'N/A',
    irrigation: 'N/A',
  });
  const [fullScreen, setFullScreen] = useState(null);
  const [moistureData, setMoistureData] = useState({ sensor1: null, sensor2: null });
  const [moistureError, setMoistureError] = useState(false);
  const [language, setLanguage] = useState('en'); 

  // Toggle language between English and Hindi
  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
    
    translateCaptions();
  };

  // Translate captions based on language
  const translateCaptions = () => {
    const t = translations[language] || translations.en;
    let translatedCaption = captions;
    if (captions.includes('Waiting for commands...')) {
      translatedCaption = t.waiting;
    } else if (captions.includes('Analyzing crop...')) {
      translatedCaption = t.analyzing;
    } else if (captions.includes('Crop detected: ')) {
      translatedCaption = t.detected + (captions.split(': ')[1] || '');
    }
    setCaptions(translatedCaption);
  };

  // Integrate WebSocket hook
  const { socket, messages, isListening } = useWebSocket('https://fateh-2.onrender.com');

  useEffect(() => {
    const ws = new WebSocket('ws://example.com/control');
    ws.onmessage = (event) => {
      const message = event.data;
      console.log('Received:', message);
      if (message === 'hello' && !eyesOpen) {
        setEyesOpen(true);
        setTimeout(() => {
          setShowMainScreen(true); 
        }, 3000);
      } else if (message.startsWith('drone:')) {
        setDroneFeed(message.replace('drone:', ''));
      } else if (message.startsWith('caption:')) {
        const newCaption = message.replace('caption:', '');
        setCaptions(newCaption);
        // cropdata updates
        if (newCaption.toLowerCase().includes('snake plant')) {
          setCropData((prev) => ({
            ...prev,
            type: 'Snake Plant',
            requiredMoisture: '2000',
          }));
        } else if (newCaption.toLowerCase().includes('asparagus fern')) {
          setCropData((prev) => ({
            ...prev,
            type: 'Asparagus Fern',
            requiredMoisture: '2010',
          }));
        } else if (newCaption.toLowerCase().includes('wheat')) {
          setCropData((prev) => ({
            ...prev,
            type: 'Wheat',
            requiredMoisture: '40',
          }));
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [eyesOpen]);

  // WebSocket event handling
  useEffect(() => {
    if (socket) {
      socket.on('robot_wakeup', () => {
        console.log('👁 Robot Wakeup via WebSocket');
        setEyesOpen(true);
        setTimeout(() => setShowMainScreen(true), 3000); 
      });

      if (messages && messages.length > 0) {
        const newCaption = messages[messages.length - 1].text;
        setCaptions(newCaption);
        // Update cropData based on caption (in English)
        if (newCaption.toLowerCase().includes('snake plant')) {
          setCropData((prev) => ({
            ...prev,
            type: 'Snake Plant',
            requiredMoisture: '2000',
          }));
        } else if (newCaption.toLowerCase().includes('asparagus fern')) {
          setCropData((prev) => ({
            ...prev,
            type: 'Asparagus Fern',
            requiredMoisture: '2010',
          }));
        } else if (newCaption.toLowerCase().includes('wheat')) {
          setCropData((prev) => ({
            ...prev,
            type: 'Wheat',
            requiredMoisture: '40',
          }));
        }
      }
    }
  }, [socket, messages]);

  // moisture WebSocket
  useEffect(() => {
    const moistureWs = new WebSocket('ws://192.168.50.183:8080');
    moistureWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Moisture WebSocket Received:', data);
        setMoistureData({
          sensor1: data.sensor1 || null,
          sensor2: data.sensor2 || null,
        });
        setMoistureError(false);
      } catch (error) {
        console.error('Moisture WebSocket message parse error:', error);
        setMoistureError(true);
      }
    };

    moistureWs.onerror = (error) => {
      console.error('Moisture WebSocket error:', error);
      setMoistureError(true);
    };

    moistureWs.onclose = () => {
      console.log('Moisture WebSocket closed');
      setMoistureError(true);
    };

    return () => {
      moistureWs.close();
    };
  }, []);

  // handle captions 
  useEffect(() => {
    if (captions !== 'Waiting for commands...' && captions !== translations.hi.waiting) {
      const lowerCaption = captions.toLowerCase();
      let newCropType = cropData.type;
      let newRequiredMoisture = cropData.requiredMoisture;

      if (lowerCaption.includes('snake plant')) {
        newCropType = 'Snake Plant';
        newRequiredMoisture = '2000';
      } else if (lowerCaption.includes('asparagus fern')) {
        newCropType = 'Asparagus Fern';
        newRequiredMoisture = '2010';
      } else if (lowerCaption.includes('wheat')) {
        newCropType = 'Wheat';
        newRequiredMoisture = '40';
      }

      setCropData((prev) => ({
        ...prev,
        type: newCropType,
        requiredMoisture: newRequiredMoisture,
      }));
    }
  }, [captions]);

  // update crop data with moisture levels or fallback
  useEffect(() => {
    setCropData((prev) => {
      let currentMoisture;
      if (moistureError) {
        currentMoisture = 'N/A';
      } else if (moistureData.sensor1 !== null && moistureData.sensor2 !== null) {
        currentMoisture =
          prev.type === 'Snake Plant'
            ? moistureData.sensor1
            : prev.type === 'Asparagus Fern'
            ? moistureData.sensor2
            : prev.currentMoisture;
      } else {
        currentMoisture = prev.currentMoisture;
      }

      const requiredMoistureNum =
        prev.requiredMoisture === 'N/A' ? Infinity : parseInt(prev.requiredMoisture);
      const currentMoistureNum =
        currentMoisture === 'N/A' ? 0 : parseInt(currentMoisture);

      const irrigation =
        currentMoisture === 'N/A' || prev.requiredMoisture === 'N/A'
          ? prev.irrigation
          : requiredMoistureNum < currentMoistureNum
          ? 'Irrigation Required'
          : requiredMoistureNum > currentMoistureNum
          ? 'Irrigation Not Required'
          : prev.irrigation;

      return {
        ...prev,
        currentMoisture,
        irrigation,
      };
    });
  }, [moistureData, moistureError]);

  const toggleFullScreen = (panel) => {
    setFullScreen(fullScreen === panel ? null : panel);
  };

  console.log('Eyes Open:', eyesOpen, 'Show Main Screen:', showMainScreen, 'Language:', language);

  return (
    <SafeAreaView style={styles.container}>
      {showMainScreen && (
        <View style={styles.headerContainer}>
          <Header language={language} />
        </View>
      )}
      {!showMainScreen ? (
        <EyesComponent isOpen={eyesOpen} />
      ) : fullScreen ? (
        fullScreen === 'drone' ? (
          {/* <DroneStreamComponent
            feed={droneFeed}
            onToggleFullScreen={() => toggleFullScreen('drone')}
            isFullScreen={true}
            language={language}
          /> */}
        ) : fullScreen === 'captions' ? (
          <CaptionsComponent
            text={captions}
            onToggleFullScreen={() => toggleFullScreen('captions')}
            isFullScreen={true}
            language={language}
          />
        ) : (
          <CropInfoComponent
            data={cropData}
            onToggleFullScreen={() => toggleFullScreen('info')}
            isFullScreen={true}
            language={language}
          />
        )
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {/* <DroneStreamComponent
            feed={droneFeed}
            onToggleFullScreen={() => toggleFullScreen('drone')}
            isFullScreen={false}
            language={language}
          /> */}
          <CaptionsComponent
            text={captions}
            onToggleFullScreen={() => toggleFullScreen('captions')}
            isFullScreen={false}
            language={language}
          />
          <CropInfoComponent
            data={cropData}
            onToggleFullScreen={() => toggleFullScreen('info')}
            isFullScreen={false}
            language={language}
          />
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <Text style={styles.languageButtonText}>
              {translations[language].hindiButton}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F0',
  },
  headerContainer: {
    marginTop: 50,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  languageButton: {
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  languageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;