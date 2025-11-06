/* QiblaScreen.js  – drop-in replacement */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { magnetometer } from 'react-native-sensors';

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

const calcQibla = (lat, lon) => {
  const dLon = ((KAABA_LON - lon) * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (KAABA_LAT * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;
  return brng;
};

export default function QiblaScreen() {
  const [qibla, setQibla] = useState(null);
  const [heading, setHeading] = useState(0);
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  /* 1. location */
  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setLoc({ latitude, longitude });
        setQibla(calcQibla(latitude, longitude));
        setLoading(false);
      },
      _ => {
        setErr('Location denied');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  /* 2. compass */
  useEffect(() => {
    let sub;
    magnetometer
      .subscribe(({ x, y }) => {
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 360) % 360;
        setHeading(angle);
      })
      .then(s => (sub = s))
      .catch(() =>
        Alert.alert(
          'Sensor error',
          'Compass not available on this device/emulator'
        )
      );

    return () => sub && sub.unsubscribe();
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  const rotation = qibla !== null ? qibla - heading : 0;
  const aligned =
    Math.abs(rotation % 360) < 5 || Math.abs(rotation % 360) > 355;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Qibla Compass</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusTxt}>
          Qibla: {qibla?.toFixed(1)}°  |  Heading: {heading.toFixed(1)}°
        </Text>
      </View>

      {/* compass */}
      <View style={styles.compass}>
        {/* static cardinals */}
        <View style={styles.cardinals}>
          <Text style={[styles.cardinal, styles.n]}>N</Text>
          <Text style={[styles.cardinal, styles.e]}>E</Text>
          <Text style={[styles.cardinal, styles.s]}>S</Text>
          <Text style={[styles.cardinal, styles.w]}>W</Text>
        </View>

        {/* rotating arrow */}
        <View
          style={[
            styles.arrowWrap,
            { transform: [{ rotate: `${rotation}deg` }] },
          ]}>
          <Text style={[styles.arrow, aligned && styles.arrowGreen]}>▼</Text>
          <Text style={styles.kaaba}>🕋</Text>
        </View>

        {/* center dot */}
        <View style={styles.dot} />
      </View>

      <View
        style={[styles.footer, aligned && { backgroundColor: '#00A897' }]}>
        <Text style={[styles.footerTxt, aligned && { color: '#fff' }]}>
          {aligned ? '✓ Aligned with Qibla' : 'Rotate until arrow turns green'}
        </Text>
      </View>

      {err && <Text style={styles.err}>{err}</Text>}
    </View>
  );
}

const SIZE = 280;
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#f8f8f8', paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#00A897', marginBottom: 10 },
  statusBox: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 20 },
  statusTxt: { fontSize: 16, color: '#333' },
  compass: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 8,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  cardinals: { position: 'absolute', width: '100%', height: '100%' },
  cardinal: { position: 'absolute', fontSize: 18, fontWeight: 'bold', color: '#666' },
  n: { top: 10, left: '50%', transform: [{ translateX: -9 }] },
  e: { right: 10, top: '50%', transform: [{ translateY: -10 }] },
  s: { bottom: 10, left: '50%', transform: [{ translateX: -9 }] },
  w: { left: 10, top: '50%', transform: [{ translateY: -10 }] },
  arrowWrap: { position: 'absolute', width: '100%', height: '100%', alignItems: 'center' },
  arrow: { fontSize: 70, color: '#f9a825', marginTop: -10 },
  arrowGreen: { color: '#00A897' },
  kaaba: { fontSize: 26, position: 'absolute', top: 75, color: '#555' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00A897',
    position: 'absolute',
  },
  footer: {
    marginTop: 25,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  footerTxt: { fontSize: 16, fontWeight: '600', color: '#333' },
  err: { color: 'red', marginTop: 10 },
});