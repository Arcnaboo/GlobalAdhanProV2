import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Geolocation from "react-native-geolocation-service";
import { magnetometer, setUpdateIntervalForType, SensorTypes } from "react-native-sensors";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";

const { width } = Dimensions.get("window");
const COMPASS_SIZE = Math.min(width - 80, 300);
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

export default function QiblaScreen() {
  const [heading, setHeading] = useState(0);
  const [qiblaDir, setQiblaDir] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const rotationAnim = new Animated.Value(0);

  // Calculate bearing to Kaaba
  const calcBearing = (lat, lon) => {
    const dLon = ((KAABA_LON - lon) * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lat2 = (KAABA_LAT * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brg = (Math.atan2(y, x) * 180) / Math.PI;
    brg = (brg + 360) % 360;
    return brg;
  };

  // Request location + get bearing
  useEffect(() => {
    const reqLoc = async () => {
      try {
        const perm =
          Platform.OS === "android"
            ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
            : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

        const res = await request(perm);
        if (res !== RESULTS.GRANTED) {
          setError("Location permission denied");
          setLoading(false);
          return;
        }

        Geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const bearing = calcBearing(latitude, longitude);
            setQiblaDir(bearing);
            setLoading(false);
          },
          (e) => {
            setError("Unable to get location");
            setLoading(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      } catch (e) {
        setError("Permission error");
        setLoading(false);
      }
    };

    reqLoc();
  }, []);

  // Magnetometer heading (works on Galaxy devices)
  useEffect(() => {
    let sub;
    try {
      setUpdateIntervalForType(SensorTypes.magnetometer, 200); // 5 Hz update rate
      sub = magnetometer.subscribe(({ x, y }) => {
        let angle = Math.atan2(-x, y) * (180 / Math.PI); // Samsung axis correction
        angle = angle >= 0 ? angle : angle + 360;
        setHeading(angle);
      });
    } catch (e) {
      setError("Compass not supported");
    }
    return () => sub && sub.unsubscribe();
  }, []);

  // Arrow rotation (real compass: always points toward Kaaba)
  useEffect(() => {
    if (qiblaDir !== null) {
      const relative = (qiblaDir - heading + 360) % 360;
      Animated.spring(rotationAnim, {
        toValue: relative,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [heading, qiblaDir]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00A897" />
        <Text style={styles.sub}>Calibrating compass...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
        <Text style={styles.sub}>Enable GPS and motion sensors</Text>
      </View>
    );

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const isAligned =
    qiblaDir !== null &&
    Math.abs(((qiblaDir - heading + 360) % 360) - 0) < 5;

  return (
    <LinearGradient colors={["#f8fafc", "#e2e8f0"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Qibla Compass</Text>
        <Text style={styles.subtitle}>Point your device toward Kaaba</Text>
      </View>

      <View style={styles.compassBox}>
        <View style={styles.bg} />
        {["N", "E", "S", "W"].map((d, i) => (
          <Text key={d} style={[styles.dir, styles[`p${i}`]]}>
            {d}
          </Text>
        ))}

        <Animated.View
          style={[
            styles.arrowBox,
            { transform: [{ rotate: rotation }] },
          ]}
        >
          <Text
            style={[styles.arrow, isAligned && styles.arrowAligned]}
          >
            ⬆
          </Text>
        </Animated.View>
        <View style={styles.dot} />
      </View>

      <View
        style={[
          styles.status,
          isAligned && styles.statusAligned,
        ]}
      >
        <Text
          style={[styles.statusTxt, isAligned && styles.statusTxtAligned]}
        >
          {isAligned ? "✓ Aligned with Qibla" : "Rotate your device"}
        </Text>
        <Text
          style={[styles.dirTxt, isAligned && styles.dirTxtAligned]}
        >
          Direction: {qiblaDir?.toFixed(1)}°
        </Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📍 How to use:</Text>
        <Text style={styles.instruction}>• Hold phone flat</Text>
        <Text style={styles.instruction}>• Rotate until arrow turns teal</Text>
        <Text style={styles.instruction}>• Arrow points to Kaaba in Makkah</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "bold", color: "#00A897" },
  subtitle: { fontSize: 14, color: "#64748b" },
  header: { alignItems: "center", marginBottom: 40 },
  compassBox: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignSelf: "center",
    marginBottom: 30,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "white",
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 8,
    borderColor: "#e2e8f0",
    shadowColor: "#00A897",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  dir: { position: "absolute", fontWeight: "bold", color: "#64748b", fontSize: 18 },
  p0: { top: 16, left: "50%", transform: [{ translateX: -9 }] },
  p1: { right: 16, top: "50%", transform: [{ translateY: -10 }] },
  p2: { bottom: 16, left: "50%", transform: [{ translateX: -9 }] },
  p3: { left: 16, top: "50%", transform: [{ translateY: -10 }] },
  arrowBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: { fontSize: 100, color: "#f59e0b" },
  arrowAligned: { color: "#00A897", textShadowColor: "#00A897", textShadowRadius: 8 },
  dot: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 12,
    height: 12,
    backgroundColor: "#00A897",
    borderRadius: 6,
    transform: [{ translateX: -6 }, { translateY: -6 }],
    shadowColor: "#00A897",
    shadowRadius: 10,
  },
  status: {
    backgroundColor: "#e2e8f0",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  statusAligned: { backgroundColor: "#00A897" },
  statusTxt: {
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "600",
    fontSize: 18,
  },
  statusTxtAligned: { color: "white" },
  dirTxt: { textAlign: "center", color: "#64748b", marginTop: 4 },
  dirTxtAligned: { color: "rgba(255,255,255,0.8)" },
  instructions: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 14,
    elevation: 4,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  instruction: { fontSize: 14, color: "#64748b", lineHeight: 22 },
  sub: { color: "#64748b", marginTop: 10 },
  err: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
