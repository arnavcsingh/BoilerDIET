import { Link, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Progress from 'react-native-progress';
import Calendar from './components/Calendar';

export default function Nutrition() {
  const router = useRouter();
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  
  //current nutrient intake
  const [protein, setProtein] = useState(28);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(83);
  //set goals for the nutrients
  const proteinGoal = 60;
  const carbsGoal = 60;
  const fatGoal = 77;
  //checks how much of the goal is completed
  const [notifications, setNotifications] = useState<{
    protein: { halfway: boolean; complete: boolean };
    carbs: { halfway: boolean; complete: boolean };
    fat: { halfway: boolean; complete: boolean };
  }>({
    protein: { halfway: false, complete: false },
    carbs: { halfway: false, complete: false },
    fat: { halfway: false, complete: false },
  });
  //notification message
  const [showNotification, setShowNotification] = useState<string | null>(null);
  //confetti animation run or no run
  const [showConfetti, setShowConfetti] = useState(false);
  
  
  const notificationAnim = useRef(new Animated.Value(0)).current;
  //animation for the confetti 
  const confettiPieces = useRef(
    Array.from({ length: 50 }, () => ({
      x: new Animated.Value(Math.random() * 400 - 50),
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'][
        Math.floor(Math.random() * 5)
      ],
    }))
  ).current;
  //progress bars
  const barWidth = 300;
  const barHeight = 15;
  const barRadius = 6;
  
  //check progress and initiate notifications
  useEffect(() => {
    checkProgress('protein', protein, proteinGoal);
  }, [protein]);
  
  useEffect(() => {
    checkProgress('carbs', carbs, carbsGoal);
  }, [carbs]);
  
  useEffect(() => {
    checkProgress('fat', fat, fatGoal);
  }, [fat]);
  
  const checkProgress = (
    nutrient: 'protein' | 'carbs' | 'fat',
    current: number,
    goal: number
  ) => {
    const progress = current / goal;
    
    //check for 50% completion
    if (progress >= 0.5 && progress < 1.0 && !notifications[nutrient].halfway) {
      setNotifications(prev => ({
        ...prev,
        [nutrient]: { ...prev[nutrient], halfway: true },
      }));
      showNotificationMessage(
        `🎯 Halfway there with ${nutrient}! Keep going! 💪`, //completion message
        false
      );
    }
    
    //check for 100% completion
    if (progress >= 1.0 && !notifications[nutrient].complete) {
      setNotifications(prev => ({
        ...prev,
        [nutrient]: { ...prev[nutrient], complete: true },
      }));
      showNotificationMessage(
        `🎉 ${nutrient.charAt(0).toUpperCase() + nutrient.slice(1)} goal completed! Amazing! 🎉`, //completion message
        true
      );
    }
  };
  //slidign notification banner
  const showNotificationMessage = (message: string, withConfetti: boolean) => {
    setShowNotification(message);
    
    //animation sequence
    Animated.sequence([
      Animated.timing(notificationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(notificationAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowNotification(null));
    
    //if completed then start confetti
    if (withConfetti) {
      triggerConfetti();
    }
  };
  
  const triggerConfetti = () => {
    setShowConfetti(true);
    
    // Animate each confetti piece
    const animations = confettiPieces.map(piece => {
      // Reset position
      piece.y.setValue(-50);
      piece.rotation.setValue(0);
      
      return Animated.parallel([
        Animated.timing(piece.y, {
          toValue: 800,
          duration: 3000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotation, {
          toValue: Math.random() * 720 - 360,
          duration: 3000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ]);
    });
    
    Animated.parallel(animations).start(() => {
      setShowConfetti(false);
    });
  };
  
  //demo button for testing, ADD MEAL LOGGING
  const addNutrient = (type: 'protein' | 'carbs' | 'fat', amount: number) => {
    if (type === 'protein') setProtein(prev => Math.min(prev + amount, proteinGoal));
    if (type === 'carbs') setCarbs(prev => Math.min(prev + amount, carbsGoal));
    if (type === 'fat') setFat(prev => Math.min(prev + amount, fatGoal));
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.titleText}>Nutrition</Text>
      <Calendar onSelectDate={setSelectedDate} selected={selectedDate} />
      {/* Notification Banner */}
      {showNotification && (
        <Animated.View
          style={[
            styles.notificationBanner,
            {
              opacity: notificationAnim,
              transform: [
                {
                  translateY: notificationAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.notificationText}>{showNotification}</Text>
        </Animated.View>
      )}
      
      {/* Confetti Animation */}
      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {confettiPieces.map((piece, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confettiPiece,
                {
                  backgroundColor: piece.color,
                  left: piece.x,
                  transform: [
                    { translateY: piece.y },
                    {
                      rotate: piece.rotation.interpolate({
                        inputRange: [-360, 360],
                        outputRange: ['-360deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      )}
      

      <View style={styles.nutrients}>
        <Text>Protein {protein}g / {proteinGoal}g</Text>
        <Progress.Bar
          progress={protein / proteinGoal}
          width={barWidth}
          color={protein >= proteinGoal ? '#FFD700' : 'gold'}
          height={barHeight}
          borderRadius={barRadius}
          style={styles.progressBar}
        />
        
        <Text>Carbs {carbs}g / {carbsGoal}g</Text>
        <Progress.Bar
          progress={carbs / carbsGoal}
          width={barWidth}
          color={carbs >= carbsGoal ? '#32CD32' : 'green'}
          height={barHeight}
          borderRadius={barRadius}
          style={styles.progressBar}
        />
        
        <Text>Fat {fat}g / {fatGoal}g</Text>
        <Progress.Bar
          progress={fat / fatGoal}
          width={barWidth}
          color={fat >= fatGoal ? '#FF69B4' : 'pink'}
          height={barHeight}
          borderRadius={barRadius}
          style={styles.progressBar}
        />
      </View>
      
      {/* DEMO BUTTONS - Take out lateer*/}
      <View style={styles.demoButtons}>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => addNutrient('protein', 10)}
        >
          <Text style={styles.demoButtonText}>+10 Protein</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => addNutrient('carbs', 25)}
        >
          <Text style={styles.demoButtonText}>+25 Carbs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => addNutrient('fat', 10)}
        >
          <Text style={styles.demoButtonText}>+10 Fat</Text>
        </TouchableOpacity>
      </View>
      
      <Link href="/meal_information" style={styles.mealButton}>
        Breakfast
      </Link>
      <Link href="/meal_information" style={styles.mealButton}>
        Lunch
      </Link>
      <Link href="/meal_information" style={styles.mealButton}>
        Dinner
      </Link>
      <Link href="/camera" style={styles.pictureButton}>
        Take Picture
      </Link>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CEB888',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 10,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
  //additonal details for how the notification banner should look
  notificationBanner: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: '#4ECDC4',
    padding: 20,
    borderRadius: 15,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  notificationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  demoButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  demoButton: {
    backgroundColor: '#4ECDC4',
    padding: 10,
    borderRadius: 8,
  },
  demoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});