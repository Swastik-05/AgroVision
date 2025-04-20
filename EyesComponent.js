import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const EyesComponent = ({ isOpen }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isOpen ? 1 : 0,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const eyeWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 200],
  });

  const eyeHeight = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 40],
  });

  const borderRadius = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 40],
  });

  const scaleY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.2],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.eyesContainer}>
        {[0, 1].map((i) => (
          <Animated.View
            key={i}
            style={{
              width: eyeWidth,
              height: eyeHeight,
              backgroundColor: '#00FF00',
              borderRadius,
              marginHorizontal: 50,
              transform: [{ scaleY }, { rotate: isOpen ? '0deg' : '180deg' }],
            }}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
  },
});

export default EyesComponent;