import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('userEmail');
        const storedUserId = await AsyncStorage.getItem('userId');
        setEmail(userEmail);
        setUserId(storedUserId);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Profile</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{email || 'Not set'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{userId || 'Not set'}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CEB888',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000000',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
  },
  infoRow: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#000000',
  },
  backButton: {
    padding: 15,
    backgroundColor: '#000000ff',
    borderRadius: 10,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
