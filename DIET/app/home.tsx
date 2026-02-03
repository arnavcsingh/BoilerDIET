import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

export default function HomeScreen() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: 'Earhart', value: '1' },
    { label: 'Ford', value: '2' },
    { label: 'Hillenbrand', value: '3' },
    { label: 'Wiley', value: '4' },
    { label: 'Windsor', value: '5' },
  ]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userEmail');
              await AsyncStorage.removeItem('userId');
              console.log('User logged out');
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Boiler DIET</Text>
      <Text style={styles.descText}>(Dining Image & Evaluation Tracker)</Text>
      <DropDownPicker
      open={open}
      value={value}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      setItems={setItems}
      style={styles.hallPicker}
    />
    <Link href='/manual_logging' style={styles.button}>Manual Logging</Link>
    <Link href='/nutrition' style={styles.button}>View History</Link>
    <Link href='/camera' style={styles.button}>Take Picture</Link>
    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
      <Text style={styles.logoutButtonText}>Logout</Text>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#CEB888',
    paddingVertical: 40,
  },
  titleText: {
    marginTop: 20,
    fontSize: 40,
    fontWeight: 'bold',
  },
  descText:{
    marginBottom: 20,
  },
  hallPicker:{
    marginBottom: 20,
    marginRight: 50,
    marginLeft: 50,
    width: 300,
  },
  button: {
    marginBottom: 0,
    padding: 20,
    backgroundColor: '#000000ff',
    color: '#ffffff',
    borderRadius: 10,
    fontSize: 16,
    textAlign: 'center',
    width: 300,
  },
  logoutButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    width: 300,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
  