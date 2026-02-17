import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Mock data - replace with your API/props
const mockMealData = {
  mealName: 'Earhart Lunch', //Dining hall location, change with hall and API
  date: '09/16/2025',//Time data needed to put in here
  //Information about each food and nutrition value
  //Replace data with information from API
  foods: [
    {
      name: 'Rice',
      amount: '200g',
      calories: 260,
      carbs: 56,
      protein: 5,
      fat: 0.5,
    },
    {
      name: 'Chicken',
      amount: '100g',
      calories: 165,
      carbs: 0.6,
      protein: 31,
      fat: 3.6,
    },
    {
      name: 'Peppers',
      amount: '25g',
      calories: 63,
      carbs: 16,
      protein: 2.6,
      fat: 0.5,
    },
    {
      name: 'Onions',
      amount: '25g',
      calories: 11,
      carbs: 2.6,
      protein: 0.3,
      fat: 0,
    },
  ],
};

//allows to switch between pages
export default function MealDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  let mealData = mockMealData;
  
  if (params.mealData) { // Parses through params to get the meal data sent from the nutrition page
    try {
      const groupedMeal = JSON.parse(params.mealData as string);
      mealData = {
        mealName: `${groupedMeal.diningCourt} ${groupedMeal.mealType}`,
        date: groupedMeal.date || new Date().toLocaleDateString(),
        foods: groupedMeal.items.map((item: any) => ({
          name: item.foodName,
          amount: item.servingSize || '1 serving',
          calories: item.calories,
          carbs: item.carbs,
          protein: item.protein,
          fat: item.fat,
        })),
      };
    } catch (e) {
      console.error('Error parsing meal data:', e);
    }
  }

  const imageUri = params.imageUri as string || 'https://via.placeholder.com/300';

  const handleBack = () => { //back button, switch pages
    router.push('/');
  };

  const handleDetails = (foodName: string) => {
    // Navigate to food details or handle action
    console.log(`View details for ${foodName}`);
  };

//header section, all of the buttons at the top of the page
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{mealData.mealName}</Text>
          <Text style={styles.mealDate}>{mealData.date}</Text>
        </View>
      </View>
  
      <ScrollView //scroll view to see all details
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.mealImage}
            resizeMode="cover"
          />
        </View>

        {/* Food Items */}
        {mealData.foods.map((food, index) => ( //separate food cards for each food item in picture
          <View key={index} style={styles.foodCard}> 
            <View style={styles.foodHeader}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodAmount}>{food.amount}</Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>{food.calories} kcal</Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Carbs</Text>
              <Text style={styles.nutritionValue}>{food.carbs} g</Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{food.protein} g</Text>
            </View>

            <View style={styles.nutritionRow}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>{food.fat} g</Text>
            </View>

            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => handleDetails(food.name)}
            >
              <Link href = '/NutritionDetails' style={styles.detailsText}>Details →</Link>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    backgroundColor: '#CEB888',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  mealInfo: {
    backgroundColor: '#CEB888',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  mealName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  mealDate: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealImage: {
    width: '100%',
    height: 200,
  },
  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  foodAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  nutritionLabel: {
    fontSize: 16,
    color: '#333',
  },
  nutritionValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailsButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#cfb991',
    fontWeight: '600',
  },
});
