import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import moment from 'moment';
import 'moment-hijri';

export default function HomeScreen() {
  const [prayers, setPrayers] = useState({});
  const [nextPrayer, setNextPrayer] = useState(null);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Global Adhan Pro',
            message:
              'This app requires access to your location to show accurate prayer times.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED)
          getCurrentLocation();
        else console.log('Location permission denied');
      } else getCurrentLocation();
    } catch (err) {
      console.warn(err);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        await fetchPrayerTimes(latitude, longitude);
      },
      error => {
        console.error(error);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchPrayerTimes = async (lat, lon) => {
    try {
      const res = await axios.get(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=13`
      );
      const data = res.data.data.timings;
      setPrayers(data);
      findNextPrayer(data);

      const geo = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        {
          headers: {
            'User-Agent': 'GlobalAdhanPro/1.0 (contact@yourdomain.com)',
          },
        }
      );
      const addr = geo.data.address;
      setCity(addr.city || addr.town || addr.village || 'Unknown');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 🧠 FIXED LOGIC
  const findNextPrayer = times => {
    const now = moment();

    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const filtered = prayerOrder
      .filter(p => times[p])
      .map(p => ({ name: p, time: moment(times[p], 'HH:mm') }));

    const upcoming = filtered.find(p => now.isBefore(p.time));
    setNextPrayer(upcoming ? upcoming.name : 'Fajr');
  };

  const today = moment().format('dddd, MMMM D, YYYY');
  const hijri = moment().format('iMMMM iD, iYYYY');

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, marginTop: 200 }} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Global Adhan Pro</Text>
      <Text style={styles.location}>📍 {city}</Text>

      <View style={styles.dateCard}>
        <Text>{today}</Text>
        <Text>{hijri}</Text>
      </View>

      <View style={styles.nextCard}>
        <Text style={styles.nextLabel}>🕒 Next Prayer</Text>
        <Text style={styles.nextName}>{nextPrayer}</Text>
      </View>

      <Text style={styles.sectionTitle}>Today's Prayer Times</Text>
      {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(name => (
        <View
          key={name}
          style={[
            styles.prayerCard,
            nextPrayer === name && styles.activeCard,
          ]}
        >
          <Text
            style={[
              styles.prayerName,
              nextPrayer === name && { color: '#fff' },
            ]}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.prayerTime,
              nextPrayer === name && { color: '#fff' },
            ]}
          >
            {prayers[name]}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFFDF8' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00A897',
    textAlign: 'center',
  },
  location: { textAlign: 'center', color: 'gray', marginBottom: 20 },
  dateCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  nextCard: {
    backgroundColor: '#F9A825',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  nextLabel: { color: '#333', fontWeight: '600' },
  nextName: { fontSize: 26, fontWeight: 'bold', color: 'white' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  prayerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 8,
    elevation: 1,
  },
  activeCard: { backgroundColor: '#00A897' },
  prayerName: { fontSize: 18, fontWeight: '500', color: '#000' },
  prayerTime: { fontSize: 18, fontWeight: 'bold', color: '#000' },
});
