import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Progress from 'react-native-progress';
import Calendar from './components/Calendar';
import { fetchUserMeals, fetchUserStreak } from './components/db-nutrition-calc';
import { getUserData } from './components/db-users';

const groupMeals = (meals: any[]) => { // Groups meals together by dining court and meal type
  const grouped: { [key: string]: any } = {};
  meals.forEach(meal => {
    const key = `${meal.diningCourt || 'N/A'}_${meal.mealType || 'meal'}`;
    if (!grouped[key]) {
      grouped[key] = { key, diningCourt: meal.diningCourt || 'N/A', mealType: meal.mealType || 'meal', items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };
    }
    grouped[key].items.push(meal);
    grouped[key].totals.calories += Number(meal.calories || 0);
    grouped[key].totals.protein += Number(meal.protein || 0);
    grouped[key].totals.carbs += Number(meal.carbs || 0);
    grouped[key].totals.fat += Number(meal.fat || 0);
  });
  return Object.values(grouped);
};

export default function Nutrition() {
  const router = useRouter();
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);
  
  //current nutrient intake
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [meals, setMeals] = useState<any[]>([]);
  //set goals for the nutrients
  const [proteinGoal, setProteinGoal] = useState(50);
  const [carbsGoal, setCarbsGoal] = useState(275);
  const [fatGoal, setFatGoal] = useState(78);
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
  //streak
  const [streak, setStreak] = useState(0);

  const getApiBase = () => {
    const fromGlobal = (global as any)?.NUTRITION_API_BASE;
    const fromEnv = process.env.EXPO_PUBLIC_NUTRITION_API_BASE;
    const fallback = 'http://10.0.2.2:3000';
    return (fromGlobal || fromEnv || fallback).replace(/\/$/, '');
  };
  
  
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
    const loadUserGoals = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) return;
        const userData = await getUserData(userId);
        setProteinGoal(userData.proteinGoal || 50);
        setCarbsGoal(userData.carbsGoal || 275);
        setFatGoal(userData.fatGoal || 78);

        // Load streak
        try {
          const streakCount = await fetchUserStreak(userId, getApiBase());
          setStreak(streakCount);
        } catch (err) {
          console.log('Could not fetch streak:', err);
        }
      } catch (error) {
        console.error('Error loading user goals:', error);
      }
    };
    loadUserGoals();
  }, []);

  useEffect(() => {
    checkProgress('protein', protein, proteinGoal);
  }, [protein, proteinGoal]);
  
  useEffect(() => {
    checkProgress('carbs', carbs, carbsGoal);
  }, [carbs, carbsGoal]);
  
  useEffect(() => {
    checkProgress('fat', fat, fatGoal);
  }, [fat, fatGoal]);
  
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
  
  // Load meals for the selected date (defaults to today)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedDate) return;
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          console.warn('No user logged in');
          return;
        }
        const res = await fetchUserMeals({ userId: userId, date: selectedDate });
        if (!active) return;
        setMeals(res.meals || []);
        setProtein(Number(res.totals?.protein || 0));
        setCarbs(Number(res.totals?.carbs || 0));
        setFat(Number(res.totals?.fat || 0));
      } catch (e) {
        console.warn('Failed to load meals', e);
        if (!active) return;
        setMeals([]);
        setProtein(0); setCarbs(0); setFat(0);
      }
    })();
    return () => { active = false; };
  }, [selectedDate]);

  // Refresh streak when date changes (to update after logging a meal)
  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const streakCount = await fetchUserStreak(userId, getApiBase());
          setStreak(streakCount);
        }
      } catch (err) {
        console.log('Could not fetch streak:', err);
      }
    })();
  }, [selectedDate]);

  // Refresh streak every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (userId) {
            const streakCount = await fetchUserStreak(userId, getApiBase());
            setStreak(streakCount);
          }
        } catch (err) {
          console.log('Could not fetch streak:', err);
        }
      })();
    }, [])
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.titleText}>Nutrition</Text>
      
      {/* Streak Button */}
      <TouchableOpacity
        style={[styles.streakButton, streak > 0 && styles.streakButtonActive]}
        activeOpacity={0.8}
      >
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakText}>{streak} Day Streak</Text>
      </TouchableOpacity>
      
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
      
      {/* Meal list */}
      <ScrollView // Makes the meal list scrollable
      contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
        style={styles.mealList}>
        <Text style={styles.sectionTitle}>Meals ({groupMeals(meals).length})</Text>
        {meals.length === 0 && (
          <Text style={{ color: '#555' }}>No meals for this date.</Text>
        )}
        {groupMeals(meals).map((groupedMeal) => (
          <TouchableOpacity
            key={groupedMeal.key}
            style={styles.mealCard}
            onPress={() => {
              router.push({ // When clicked opens the meal information page and sends the meal data to the page
                pathname: '/meal_information',
                params: {
                  mealData: JSON.stringify(groupedMeal),
                },
              });
            }}
          >
            <Text style={styles.mealCardTitle}>
              {groupedMeal.diningCourt} - {groupedMeal.mealType}
            </Text>
            <Text style={styles.mealCardSub}>
              {groupedMeal.items.length} item{groupedMeal.items.length !== 1 ? 's' : ''}
            </Text>
            <View style={styles.mealMacros}>
              <Text>Calories: {Number(groupedMeal.totals.calories).toFixed(0)}</Text>
              <Text>Protein: {Number(groupedMeal.totals.protein).toFixed(1)}g</Text>
              <Text>Carbs: {Number(groupedMeal.totals.carbs).toFixed(1)}g</Text>
              <Text>Fat: {Number(groupedMeal.totals.fat).toFixed(1)}g</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  titleText: {
    marginTop: 80,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  nutrients: {
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  progressBar: {
    marginBottom: 8,
  },
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
  mealList: {
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  mealCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  mealCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  mealCardSub: {
    color: '#555',
    marginTop: 4,
    marginBottom: 8,
  },
  mealMacros: {
    gap: 2,
  },
  scrollViewContent: {
    alignItems: 'stretch',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  streakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#666666',
    marginBottom: 16,
  },
  streakButtonActive: {
    backgroundColor: '#ff6600',
    borderColor: '#ff8800',
  },
  streakEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  streakText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});