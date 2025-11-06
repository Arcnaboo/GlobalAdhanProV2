import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
// Yalnızca konum için gerekli olanı kullanıyoruz
import Geolocation from 'react-native-geolocation-service'; 

// Kâbe'nin koordinatları
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

// Kıble Açısı Hesaplama Fonksiyonu
const calculateQiblaDirection = (lat, lon) => {
    const dLon = ((KAABA_LON - lon) * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lat2 = (KAABA_LAT * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return Math.round(bearing);
};


export default function QiblaScreen() {
    // Sensör verisi gelmediği için deviceHeading'i manuel olarak 0'da tutuyoruz.
    const [deviceHeading, setDeviceHeading] = useState(0); 
    const [qiblaDirection, setQiblaDirection] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Konum Al ve Kıble Yönünü Hesapla
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ latitude, longitude });
                const qiblaAngle = calculateQiblaDirection(latitude, longitude);
                setQiblaDirection(qiblaAngle);
                setLoading(false);
            },
            (err) => {
                setError("Konum alınamadı. Lütfen GPS'i kontrol edin.");
                const defaultLat = 37.4220; 
                const defaultLon = -122.0840;
                const qiblaAngle = calculateQiblaDirection(defaultLat, defaultLon);
                setQiblaDirection(qiblaAngle);
                setUserLocation({ latitude: defaultLat, longitude: defaultLon });
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );

        // PUSULA VERİSİ ARTIK ALINMAYACAK (Sensör kütüphanesi kaldırıldı)
        
        // Emülatörde pusula verisi gelmediği için uyarı gösterelim.
        if (process.env.NODE_ENV === 'development') {
             // Sadece geliştirme modunda (emülatörde) uyarı göster
             Alert.alert("Simülasyon Modu", "Pusula verisi (deviceHeading) sensörsüz cihazlarda (emülatörler dahil) alınamaz. Lütfen fiziksel cihazda test edin.");
        }


        // Temizleme fonksiyonu: Sensör aboneliği olmadığı için boş kalacak
        return () => {};
    }, []);

    // Rota Hesaplamaları
    if (loading || qiblaDirection === null) {
        return <ActivityIndicator size="large" style={styles.loading} color="#00A897" />;
    }
    
    // Kıble Okunun rotasyonu: Cihaz açısı 0 kabul edildiği için doğrudan Kıble açısı
    const qiblaRotation = qiblaDirection - deviceHeading; 
    
    // Pusula kartının rotasyonu: Cihaz açısı 0 kabul edildiği için dönmeyecektir.
    const compassRotation = -deviceHeading;

    // Hedefe hizalı mı kontrolü (Sadece deviceHeading 0 ise çalışır)
    const rotationDeg = qiblaRotation % 360;
    const isAligned = Math.abs(rotationDeg) < 5 || Math.abs(rotationDeg) > 355;


    return (
        <View style={styles.container}>
            <Text style={styles.title}>Kıble Pusulası</Text>
            <Text style={styles.locationText}>Konum: {userLocation?.latitude.toFixed(4)}, {userLocation?.longitude.toFixed(4)}</Text>

            <View style={styles.statusBox}>
                <Text style={styles.statusText}>
                    Cihaz Yönü: 0° (Sensör verisi bekleniyor)
                </Text>
                <Text style={styles.statusDirection}>
                    Mekke Açısı (Kuzey'den): {qiblaDirection}°
                </Text>
            </View>

            {/* PUSULA ÇERÇEVESİ - Artık sadece görsel amaçlıdır */}
            <View style={styles.compassFrame}>
                {/* 1. Pusula Arka Planı (Sabit kalır) */}
                <View style={[styles.compassBase, { transform: [{ rotate: `${compassRotation}deg` }] }]}>
                    <Text style={[styles.degreeMarker, styles.north]}>N</Text> 
                    <Text style={[styles.degreeMarker, styles.east]}>E</Text> 
                    <Text style={[styles.degreeMarker, styles.south]}>S</Text>
                    <Text style={[styles.degreeMarker, styles.west]}>W</Text>
                </View>

                {/* 2. Kıble Oku (Kıble açısına göre döner) */}
                <View 
                    style={[
                        styles.qiblaIndicator, 
                        { transform: [{ rotate: `${qiblaRotation}deg` }] }
                    ]}
                >
                    <Text style={[styles.arrowIcon, isAligned && styles.arrowAligned]}>▼</Text> 
                    <Text style={styles.kaabaIcon}>🕋</Text> 
                </View>
                
            </View>

            {/* Hizalama Durumu */}
            <View style={[styles.alignmentStatus, isAligned && styles.alignedStatus]}>
                <Text style={[styles.alignmentText, isAligned && { color: 'white' }]}>
                    {isAligned ? '✓ Kıble ile Hizalandı (Cihaz Kuzey’e bakıyorsa)' : 'Cihazınızı döndürmeye devam edin.'}
                </Text>
            </View>
            
            {error && <Text style={styles.errorText}>HATA: {error}</Text>}
            
            <Text style={styles.emulatorWarning}>
                **ÖNEMLİ: Pusula özelliği yalnızca sensörlü (fiziksel) Android cihazlarda çalışır. Emülatörde sadece hesaplanan açıyı görürsünüz.**
            </Text>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, alignItems: 'center', backgroundColor: '#F8F8F8' },
    loading: { flex: 1, marginTop: 200 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#00A897', marginBottom: 15 },
    locationText: { fontSize: 14, color: 'gray', marginBottom: 20 },
    
    // Status Kutusu
    statusBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statusText: { fontSize: 16, color: '#333' },
    statusDirection: { fontSize: 18, fontWeight: '600', color: '#00A897', marginTop: 5 },

    // Pusula Çerçevesi
    compassFrame: {
        width: 300,
        height: 300,
        borderRadius: 150,
        borderWidth: 8,
        borderColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 40,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 15,
        overflow: 'hidden', 
    },
    compassBase: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    degreeMarker: {
        position: 'absolute',
        fontWeight: 'bold',
        fontSize: 16,
        color: '#A0A0A0',
        backgroundColor: 'transparent',
    },
    north: { top: 15, color: '#00A897' }, 
    east: { right: 15, top: '50%', transform: [{ translateY: -10 }] }, 
    south: { bottom: 15 },
    west: { left: 15, top: '50%', transform: [{ translateY: -10 }] },
    
    // Kıble Göstergesi (Ok)
    qiblaIndicator: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    arrowIcon: {
        fontSize: 80, 
        color: '#F9A825', 
        marginTop: -5,
        height: 80,
    },
    arrowAligned: {
        color: '#00A897',
    },
    kaabaIcon: {
        fontSize: 30,
        position: 'absolute',
        top: 80,
        color: '#555',
    },

    // Hizalama Durum Kutusu
    alignmentStatus: {
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#E0E0E0',
        width: '80%',
        alignItems: 'center',
        marginBottom: 10,
    },
    alignedStatus: {
        backgroundColor: '#00A897',
    },
    alignmentText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    emulatorWarning: {
        fontSize: 12,
        color: '#FF0000',
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 14,
        color: 'red',
        marginTop: 10,
        textAlign: 'center',
    }
});