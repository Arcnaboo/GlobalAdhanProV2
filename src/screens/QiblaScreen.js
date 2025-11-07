import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Dimensions,
  PermissionsAndroid,
} from 'react-native';

const QiblaScreen = () => {
  const [qiblaDirection, setQiblaDirection] = useState(null);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  const [calibrating, setCalibrating] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  // Kaaba coordinates
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;

  // Request location permission at the start
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          console.log('Requesting Android location permission...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Qibla Compass Location Permission',
              message:
                'Qibla Compass needs access to your location ' +
                'to calculate the direction to Kaaba.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Location permission granted');
            setLocationPermission(true);
            getCurrentLocation();
          } else {
            console.log('Location permission denied');
            setError('Location permission denied. Please enable location services in settings.');
            setCalibrating(false);
          }
        } else {
          // iOS - location permission is handled differently
          console.log('iOS location permission flow');
          setLocationPermission(true);
          getCurrentLocation();
        }
      } catch (err) {
        console.log('Location permission error:', err);
        setError('Failed to get location permission.');
        setCalibrating(false);
      }
    };

    requestLocationPermission();
  }, []);

  const calculateQiblaDirection = (lat, lon) => {
    const dLon = ((KAABA_LON - lon) * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lat2 = (KAABA_LAT * Math.PI) / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  const getCurrentLocation = () => {
    console.log('Getting current location...');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this device.');
      setCalibrating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained:', position.coords);
        const { latitude, longitude } = position.coords;
        const bearing = calculateQiblaDirection(latitude, longitude);
        setQiblaDirection(bearing);
        setCalibrating(false);
        
        // Now start compass after getting location
        startCompass();
      },
      (err) => {
        console.log('Location error:', err);
        let errorMessage = 'Unable to get location. ';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += 'Location permission denied. Please enable location services.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            break;
          case err.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Please enable location services.';
        }
        
        setError(errorMessage);
        setCalibrating(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 60000 
      }
    );
  };

  // Compass functionality using device orientation
  const startCompass = () => {
    let isSubscribed = true;

    const handleDeviceOrientation = (event) => {
      if (isSubscribed && event.alpha !== null) {
        // Use alpha (compass heading) for orientation
        setHeading(event.alpha);
      }
    };

    // Check if device orientation is available
    if (window.DeviceOrientationEvent) {
      console.log('Device orientation supported');
      
      // For iOS 13+, request permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        console.log('Requesting iOS device orientation permission...');
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              console.log('Device orientation permission granted');
              window.addEventListener('deviceorientation', handleDeviceOrientation, true);
            } else {
              console.log('Device orientation permission denied');
              setError('Compass permission denied. Please enable compass access in settings.');
            }
          })
          .catch((err) => {
            console.log('Device orientation error:', err);
            setError('Compass not supported on this device.');
          });
      } else {
        // For Android and older iOS
        console.log('Adding device orientation listener');
        window.addEventListener('deviceorientation', handleDeviceOrientation, true);
      }
    } else {
      console.log('Device orientation not supported');
      setError('Compass not supported on this device.');
    }

    return () => {
      isSubscribed = false;
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    };
  };

  // Smooth rotation animation
  useEffect(() => {
    if (qiblaDirection !== null) {
      const rotation = (qiblaDirection - heading + 360) % 360;
      Animated.timing(rotationAnim, {
        toValue: rotation,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [qiblaDirection, heading]);

  const rotation = qiblaDirection !== null ? (qiblaDirection - heading + 360) % 360 : 0;
  const isAligned = Math.abs(rotation % 360) < 5 || Math.abs(rotation % 360) > 355;

  if (calibrating) {
    return (
      <View style={styles.calibratingContainer}>
        <View style={styles.calibratingContent}>
          <ActivityIndicator size="large" color="#00A897" />
          <Text style={styles.calibratingText}>Requesting location access...</Text>
          <Text style={styles.calibratingSubtext}>
            Please allow location permission to calculate Qibla direction
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>🧭</Text>
          </View>
          <Text style={styles.errorTitle}>Permission Required</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHelp}>
            Please check your device settings and grant location & motion permissions, then restart the app.
          </Text>
        </View>
      </View>
    );
  }

  const rotateInterpolate = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Qibla Compass</Text>
        <Text style={styles.subtitle}>Point your device toward Kaaba</Text>
      </View>

      {/* Compass */}
      <View style={styles.compassContainer}>
        {/* Background circle */}
        <View style={styles.compassBackground} />
        
        {/* Degree markers */}
        <View style={styles.compassMarkers}>
          {['N', 'E', 'S', 'W'].map((direction, index) => (
            <Text
              key={direction}
              style={[
                styles.compassDirection,
                index === 0 && styles.north,
                index === 1 && styles.east,
                index === 2 && styles.south,
                index === 3 && styles.west,
              ]}
            >
              {direction}
            </Text>
          ))}
        </View>

        {/* Rotating Qibla indicator */}
        <Animated.View 
          style={[
            styles.arrowContainer,
            { transform: [{ rotate: rotateInterpolate }] }
          ]}
        >
          <Text style={[
            styles.arrow,
            isAligned && styles.arrowAligned
          ]}>
            ➤
          </Text>
        </Animated.View>

        {/* Center dot */}
        <View style={styles.centerDot} />
      </View>

      {/* Status */}
      <View style={[
        styles.statusContainer,
        isAligned && styles.statusAligned
      ]}>
        <Text style={[
          styles.statusText,
          isAligned && styles.statusTextAligned
        ]}>
          {isAligned ? '✓ Aligned with Qibla' : 'Keep rotating your device'}
        </Text>
        <Text style={[
          styles.directionText,
          isAligned && styles.directionTextAligned
        ]}>
          Direction: {qiblaDirection?.toFixed(1)}°
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>
          📍 How to use:
        </Text>
        <View style={styles.instructionsList}>
          <Text style={styles.instruction}>• Hold your device flat</Text>
          <Text style={styles.instruction}>• Rotate until the arrow turns teal</Text>
          <Text style={styles.instruction}>• The arrow points toward Kaaba in Makkah</Text>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width - 80, 300);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  calibratingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  calibratingContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  calibratingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  calibratingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#fee2e2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  errorHelp: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00A897',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  compassContainer: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignSelf: 'center',
    marginBottom: 32,
  },
  compassBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: COMPASS_SIZE / 2,
    backgroundColor: '#ffffff',
    borderWidth: 8,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  compassMarkers: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  compassDirection: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
  },
  north: {
    top: 16,
    left: '50%',
    transform: [{ translateX: -9 }],
  },
  east: {
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  south: {
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -9 }],
  },
  west: {
    left: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  arrowContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 80,
    color: '#f59e0b',
    marginTop: -20,
  },
  arrowAligned: {
    color: '#00A897',
  },
  centerDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00A897',
    transform: [{ translateX: -6 }, { translateY: -6 }],
    shadowColor: '#00A897',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  statusContainer: {
    backgroundColor: '#e2e8f0',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusAligned: {
    backgroundColor: '#00A897',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  statusTextAligned: {
    color: '#ffffff',
  },
  directionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  directionTextAligned: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  instructionsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

export default QiblaScreen;