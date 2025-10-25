import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';
import Calendar from './components/Calendar';

export default function Nutrition() {
    const [selectedDate, setSelectedDate] = useState(null); 
    let protein = 28;
    let carbs = 200;
    let fat = 83;
    let proteinGoal = 60;
    let carbsGoal = 225;
    let fatGoal = 77;
    
    let barWidth = 300
    let barHeight = 15
    let barRadius = 6
    return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Nutrition Tracker</Text>
      <Calendar onSelectDate={setSelectedDate} selected={selectedDate} />
      
      <View style={styles.nutrients}>
      <Text>Protein {protein}g / {proteinGoal}g</Text>
    <Progress.Bar 
        progress={protein/proteinGoal} 
        width={barWidth} 
        color={"gold"} 
        height={barHeight} 
        borderRadius={barRadius}
        style={styles.progressBar}
      />
      <Text>Carbs {carbs}g / {carbsGoal}g</Text>
      <Progress.Bar 
        progress={carbs/carbsGoal} 
        width={barWidth} 
        color={"green"} 
        height={barHeight} 
        borderRadius={barRadius}
        style={styles.progressBar}
      />
      <Text>Fat {fat}g / {fatGoal}g</Text>
      <Progress.Bar 
        progress={fat/fatGoal} 
        width={barWidth} 
        color={"pink"} 
        height={barHeight} 
        borderRadius={barRadius}
        style={styles.progressBar}
      />
      </View>
      <Link href='/meal_information' style={styles.mealButton}>Breakfast</Link>
      <Link href='/meal_information' style={styles.mealButton}>Lunch</Link>
      <Link href='/meal_information' style={styles.mealButton}>Dinner</Link>
      <Link href='/camera' style={styles.pictureButton}>Take Picture</Link>
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
  nutrients: {
    marginTop: -30,
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#ffffffff',
    padding: 30,
    borderRadius: 10,
  },
  progressBar:{
    marginBottom: 5,
  },
  mealButton:{
    marginTop:20,
    padding: 10,
    backgroundColor: '#ffffffff',
    fontSize: 30,
    borderRadius: 25,
    textAlign: 'left',
    width: 350,
    height: 70,
    textAlignVertical: 'center',
  },
  pictureButton:{
    marginTop:30,
    padding: 10,
    backgroundColor: '#000000ff',
    fontSize: 30,
    borderRadius: 25,
    textAlign: 'center',
    width: 350,
    marginBottom: 100,
    color: 'white',
  },
});