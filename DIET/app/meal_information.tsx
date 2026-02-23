import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { editUserMeal, deleteUserMeal } from './components/db-nutrition-calc';

// Mock data - replace with your API/props
const mockMealData = {
  mealName: 'Earhart Lunch', //Dining hall location, change with hall and API
  date: '09/16/2025',//Time data needed to put in here
  //Information about each food and nutrition value
  //Replace data with information from API
  foods: [
    {
      id: 1,
      name: 'Rice',
      volume: '1',
      amount: 'bowl',
      calories: 260,
      carbs: 56,
      protein: 5,
      fat: 0.5,
    },
    {
      id: 2,
      name: 'Chicken',
      volume: '2',
      amount: 'leg',
      calories: 165,
      carbs: 0.6,
      protein: 31,
      fat: 3.6,
    },
    {
      id: 3,
      name: 'Peppers',
      volume: '1',
      amount: 'cup',
      calories: 63,
      carbs: 16,
      protein: 2.6,
      fat: 0.5,
    },
    {
      id: 4,
      name: 'Onions',
      volume: '1',
      amount: 'cup',
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [mealData, setMealData] = useState(mockMealData);

  React.useEffect(() => {
    if (params.mealData) { // Parses through params to get the meal data sent from the nutrition page
      try {
        const groupedMeal = JSON.parse(params.mealData as string);
        setMealData({
          mealName: `${groupedMeal.diningCourt} ${groupedMeal.mealType}`,
          date: groupedMeal.date || new Date().toLocaleDateString(),
          foods: groupedMeal.items.map((item: any) => ({
            id: item.id,
            name: item.foodName,
            volume: item.volume,
            amount: item.servingSize || '1 serving',
            calories: item.calories,
            carbs: item.carbs,
            protein: item.protein,
            fat: item.fat,
          })),
        });
      } catch (e) {
        console.error('Error parsing meal data:', e);
      }
    }
  }, [params.mealData]);

  const imageUri = params.imageUri as string || 'https://via.placeholder.com/300';

  const handleBack = () => { //back button, switch pages
    router.push('/');
  };

  const handleDetails = (foodName: string) => {
    // Navigate to food details or handle action
    console.log(`View details for ${foodName}`);
    router.push({
      pathname: '/meal_information',
      params: {
        ItemId: JSON.stringify(foodName),
      },
    });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditAmount(mealData.foods[index].volume);
  };

  const handleSaveEdit = (index: number) => {
    const updatedFoods = [...mealData.foods];
    updatedFoods[index].volume = editAmount;
    setMealData({ ...mealData, foods: updatedFoods });
    editUserMeal(mealData.foods[index].id, editAmount);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const updatedFoods = mealData.foods.filter((_, i) => i !== index);
    setMealData({ ...mealData, foods: updatedFoods });
    deleteUserMeal(mealData.foods[index].id);
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
              <Text style={styles.foodAmount}>{food.volume}</Text>
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

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.detailsButton} onPress={() => handleDetails(food.name)}>
                <Text style={styles.detailsText}>Details →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(index)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(index)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

        // Displays the popup to edit item volumes
      <Modal visible={editingIndex !== null} transparent animationType="fade"> 
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Amount</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Amount"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => editingIndex !== null && handleSaveEdit(editingIndex)}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    paddingHorizontal: 8,
  },
  editText: {
    fontSize: 14,
    color: '#cfb991',
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#CEB888',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#ddd',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
