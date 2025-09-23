import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

export default function HomeScreen() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: 'Earhart', value: '1' },
    { label: 'Ford', value: '2' },
    { label: 'Hillenbrand', value: '3' },
    { label: 'Wiley', value: '4' },
    { label: 'Windsor', value: '5' },
  ]);

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CEB888',
  },
  titleText: {
    marginTop: 100,
    fontSize: 40,
    fontWeight: 'bold',
  },
  descText:{
    marginBottom: 150,
  },
  hallPicker:{
    marginBottom: 500,
    marginRight: 50,
    marginLeft: 50,
    width: 300,
  }
});
  