import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { calculateNutrition, deleteUserMeal, editUserMeal } from './components/db-nutrition-calc';

type FoodItem = {
  id: number | string;
  name: string;
  volume: string;
  amount: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  itemId: string;
  persisted?: boolean;
};

type MenuItem = {
  label: string;
  value: string;
  servingSize?: string;
};

const getApiBase = () => {
  const fromGlobal = (global as any)?.NUTRITION_API_BASE;
  const fromEnv = process.env.EXPO_PUBLIC_NUTRITION_API_BASE;
  return (fromGlobal || fromEnv || 'http://10.0.2.2:3000').replace(/\/$/, '');
};

const mockMealData = {
  mealName: 'Meal Details',
  date: new Date().toLocaleDateString(),
  foods: [] as FoodItem[],
};

export default function MealDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [mealData, setMealData] = useState(mockMealData);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showManualPickerModal, setShowManualPickerModal] = useState(false);
  const [showServingModal, setShowServingModal] = useState(false);

  const [suggestedMatches, setSuggestedMatches] = useState<string[]>([]);
  const [fullMenuItems, setFullMenuItems] = useState<MenuItem[]>([]);
  const [menuSearch, setMenuSearch] = useState('');

  const [selectedFoodName, setSelectedFoodName] = useState('');
  const [selectedServings, setSelectedServings] = useState('1');

  const [loadingMenu, setLoadingMenu] = useState(false);
  const [applyingSelection, setApplyingSelection] = useState(false);

  const classificationLabel = (params.classification as string) || 'Detected meal';
  const imageUri = (params.imageUri as string) || 'https://via.placeholder.com/300';

  useEffect(() => {
    if (!params.mealData) return;
    try {
      const groupedMeal = JSON.parse(params.mealData as string);
      setMealData({
        mealName: `${groupedMeal.diningCourt} ${groupedMeal.mealType}`,
        date: groupedMeal.date || new Date().toLocaleDateString(),
        foods: (groupedMeal.items || []).map((item: any) => ({
          id: item.id,
          name: item.foodName,
          volume: String(item.volume ?? '1'),
          amount: item.servingSize || '1 serving',
          calories: Number(item.calories ?? 0),
          carbs: Number(item.carbs ?? 0),
          protein: Number(item.protein ?? 0),
          fat: Number(item.fat ?? 0),
          itemId: item.itemId || '',
          persisted: true,
        })),
      });
    } catch (e) {
      console.error('Error parsing meal data:', e);
    }
  }, [params.mealData]);

  useEffect(() => {
    // Show the selection modal whenever we arrive from the camera flow
    if (!params.imageUri || params.mealData) return;
    try {
      const parsed = params.matches ? JSON.parse(params.matches as string) : [];
      const matchNames = Array.isArray(parsed) ? parsed : [];
      setSuggestedMatches(matchNames.slice(0, 5));
    } catch (e) {
      console.error('Error parsing camera matches:', e);
      setSuggestedMatches([]);
    }
    setShowSuggestionModal(true);
  }, [params.imageUri, params.matches, params.mealData]);

  const filteredMenuItems = useMemo(() => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return fullMenuItems.slice(0, 40);
    return fullMenuItems.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 40);
  }, [fullMenuItems, menuSearch]);

  const fetchFullMenuItems = async () => {
    if (fullMenuItems.length) return;
    setLoadingMenu(true);
    try {
      const res = await fetch(`${getApiBase()}/menu/all?limit=3000`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load full menu');
      setFullMenuItems(json.items || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load full menu');
    } finally {
      setLoadingMenu(false);
    }
  };

  const openServingsForFood = (foodName: string) => {
    setSelectedFoodName(foodName);
    setSelectedServings('1');
    setShowServingModal(true);
  };

  const applySelection = async (foodName: string, servingsText: string) => {
    const servings = Number(servingsText);
    if (!foodName) return;
    if (!Number.isFinite(servings) || servings <= 0) {
      Alert.alert('Invalid servings', 'Please enter a positive number.');
      return;
    }

    setApplyingSelection(true);
    try {
      const data: any = await calculateNutrition(foodName, servings, 'serving');
      const nextFood: FoodItem = {
        id: Date.now(),
        name: foodName,
        volume: String(servings),
        amount: data?.servingSize || '1 serving',
        calories: Number(data?.calories ?? 0),
        carbs: Number(data?.carbs ?? data?.totalCarbs ?? 0),
        protein: Number(data?.protein ?? 0),
        fat: Number(data?.fat ?? data?.totalFat ?? 0),
        itemId: data?.itemId || '',
        persisted: false,
      };

      setMealData({
        mealName: classificationLabel,
        date: new Date().toLocaleDateString(),
        foods: [nextFood],
      });

      setShowServingModal(false);
      setShowSuggestionModal(false);
      setShowManualPickerModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch nutrition for selected item');
    } finally {
      setApplyingSelection(false);
    }
  };

  const handleDetails = (itemId: string) => {
    if (!itemId) return;
    router.push(`/NutritionDetails?itemId=${itemId}`);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditAmount(mealData.foods[index].volume);
  };

  const handleSaveEdit = async (index: number) => {
    const updatedFoods = [...mealData.foods];
    updatedFoods[index].volume = editAmount;
    setMealData({ ...mealData, foods: updatedFoods });

    const current = updatedFoods[index];
    if (current.persisted && current.id !== undefined && current.id !== null) {
      try {
        await editUserMeal(String(current.id), editAmount);
      } catch (err) {
        console.error('Failed to edit persisted meal item', err);
      }
    }

    setEditingIndex(null);
  };

  const handleDelete = async (index: number) => {
    const target = mealData.foods[index];
    const updatedFoods = mealData.foods.filter((_, i) => i !== index);
    setMealData({ ...mealData, foods: updatedFoods });

    if (target.persisted && target.id !== undefined && target.id !== null) {
      try {
        await deleteUserMeal(String(target.id));
      } catch (err) {
        console.error('Failed to delete persisted meal item', err);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/home')}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{mealData.mealName}</Text>
          <Text style={styles.mealDate}>{mealData.date}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.mealImage} resizeMode="cover" />
        </View>

        {mealData.foods.map((food, index) => (
          <View key={`${food.id}-${index}`} style={styles.foodCard}>
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
              <TouchableOpacity style={styles.detailsButton} onPress={() => handleDetails(food.itemId)}>
                <Text style={styles.detailsText}>Details -></Text>
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

      <Modal visible={showSuggestionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pick a Detected Item</Text>
            <Text style={styles.modalSubtitle}>Top 5 model/menu matches</Text>

            {suggestedMatches.map((name, idx) => (
              <TouchableOpacity
                key={`${name}-${idx}`}
                style={styles.choiceButton}
                onPress={() => openServingsForFood(name)}
              >
                <Text style={styles.choiceButtonText}>{idx + 1}. {name}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.choiceButton, styles.choiceButtonManual]}
              onPress={async () => {
                setShowSuggestionModal(false);
                setShowManualPickerModal(true);
                await fetchFullMenuItems();
              }}
            >
              <Text style={styles.choiceButtonText}>6. Choose any item from full menu</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowSuggestionModal(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showManualPickerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose from Full Menu</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Search menu item"
              value={menuSearch}
              onChangeText={setMenuSearch}
            />

            {loadingMenu ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ScrollView style={{ maxHeight: 250 }}>
                {filteredMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={styles.choiceButton}
                    onPress={() => openServingsForFood(item.label)}
                  >
                    <Text style={styles.choiceButtonText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowManualPickerModal(false);
                setShowSuggestionModal(true);
              }}
            >
              <Text style={styles.modalButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showServingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Servings</Text>
            <Text style={styles.modalSubtitle}>{selectedFoodName}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Servings (e.g. 1, 1.5)"
              keyboardType="numeric"
              value={selectedServings}
              onChangeText={setSelectedServings}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => applySelection(selectedFoodName, selectedServings)}
                disabled={applyingSelection}
              >
                <Text style={styles.modalButtonText}>{applyingSelection ? 'Applying...' : 'Confirm'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowServingModal(false)}
                disabled={applyingSelection}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setEditingIndex(null)}>
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
    fontSize: 16,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
    width: '85%',
    maxWidth: 480,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  choiceButton: {
    backgroundColor: '#CEB888',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  choiceButtonManual: {
    backgroundColor: '#bca06b',
  },
  choiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
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
    marginTop: 8,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
