import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userEmail');
              await AsyncStorage.removeItem('userId');
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require('../assets/images/purdue.png')}
        style={styles.logo}
      />

      {/* Title */}
      <Text style={styles.titleText}>Boiler D.I.E.T</Text>
      <Text style={styles.descText}>
        (Dining Image & Evaluation Tracker)
      </Text>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.redGlow]}
          onPress={() => router.push('/manual_logging')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Manual Logging</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.greenGlow]}
          onPress={() => router.push('/nutrition')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>View History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.pinkGlow]}
          onPress={() => router.push('/camera')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Take Picture</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.blueGlow]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.8}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const glowStyle = (color: string, bg: string, border: string) => ({
  backgroundColor: bg,
  borderColor: border,
  ...(Platform.OS === 'ios'
    ? {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
      }
    : {}),
  elevation: 20,
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#CEB888',
    paddingTop: 60,
  },

  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 10,
  },

  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  descText: {
    fontSize: 14,
    marginBottom: 30,
  },

  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 20,
  },

  button: {
    width: 300,
    padding: 18,
    borderRadius: 12,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Glow styles — each has its own borderColor
  redGlow: glowStyle('red', '#000000', '#da1212'),
  greenGlow: glowStyle('green', '#000000', 'green'),
  pinkGlow: glowStyle('magenta', '#000000', 'magenta'),
  blueGlow: glowStyle('#2b00ff', '#000000', '#2b00ff'),

  logoutButton: {
    marginTop: 30,
    width: 300,
    padding: 18,
    backgroundColor: '#ed1111',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },

  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
