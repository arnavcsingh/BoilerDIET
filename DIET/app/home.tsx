import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
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
        <Link href="/manual_logging" asChild>
          <TouchableOpacity style={[styles.button, styles.redGlow]}>
            <Text style={styles.buttonText}>Manual Logging</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/nutrition" asChild>
          <TouchableOpacity style={[styles.button, styles.greenGlow]}>
            <Text style={styles.buttonText}>View History</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/camera" asChild>
          <TouchableOpacity style={[styles.button, styles.pinkGlow]}>
            <Text style={styles.buttonText}>Take Picture</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/profile" asChild>
          <TouchableOpacity style={[styles.button, styles.blueGlow]}>
            <Text style={styles.buttonText}>Profile</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

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
    backgroundColor: '#000',
    borderRadius: 12,
    marginVertical: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Glow styles
  redGlow: {
    shadowColor: 'red',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },

  greenGlow: {
    shadowColor: 'green',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },

  pinkGlow: {
    shadowColor: 'magenta',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },

  blueGlow: {
    shadowColor: 'blue',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },

  logoutButton: {
    marginTop: 30,
    width: 300,
    padding: 18,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },

  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});