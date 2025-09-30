import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Calendar from './components/Calendar';

export default function Nutrition() {
    const [selectedDate, setSelectedDate] = useState(null); 
    return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Nutrition Tracker</Text>
      <Calendar onSelectDate={setSelectedDate} selected={selectedDate} />
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
});