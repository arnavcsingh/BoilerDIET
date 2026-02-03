import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { calculateNutrition, saveMealToDatabase, saveUserMeal } from './components/db-nutrition-calc';

// Attempt to derive grams from a serving size string.
// Supports patterns like:
//  - "100g", "100 g"
//  - "1 oz (28g)" or "1 oz (28 g)"
//  - "2 pieces (85 g)"
//  - "1 cup (240 g)"
// Falls back to 100.
function parseServingToGrams(serving:string): number {
  if (!serving) return 100;
  // direct grams e.g. 100g or 100 g
  const direct = serving.match(/(\d+\.?\d*)\s*g/i);
  if (direct) return parseFloat(direct[1]);
  // grams inside parentheses e.g. (85 g) or (28g)
  const paren = serving.match(/\(([^)]*)\)/);
  if (paren) {
    const inner = paren[1];
    const innerMatch = inner.match(/(\d+\.?\d*)\s*g/i);
    if (innerMatch) return parseFloat(innerMatch[1]);
  }
  // ounces: capture number then convert (1 oz ≈ 28.3495g)
  const oz = serving.match(/(\d+\.?\d*)\s*oz/i);
  if (oz) return parseFloat(oz[1]) * 28.35;
  // generic fallback
  return 100;
}

interface NutritionResult {
  food: string;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  allergens: string[];
}

export default function ManualLogging() {
  const [openCourt, setOpenCourt] = useState(false);
  const [openMealType, setOpenMealType] = useState(false);
  const [openItem, setOpenItem] = useState(false);
  const [itemValue, setItemValue] = useState<string | null>(null);
  const [selectedFoodName, setSelectedFoodName] = useState<string>(''); // Store actual food name
  const [servingSize, setServingSize] = useState('1 serving');
  const [quantity, setQuantity] = useState('1');
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);
  const [items, setItems] = useState<{ label: string; value: string; servingSize?: string }[]>([]);
  const [courts, setCourts] = useState<{ label: string; value: string }[]>([]);
  const [mealTypes, setMealTypes] = useState<{ label: string; value: string }[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingCourts, setLoadingCourts] = useState(false);

      // Fetch dining courts and meal types on mount
      useEffect(() => {
        let mounted = true;
        (async () => {
          try {
            setLoadingCourts(true);
            const base = 'http://100.69.156.199:3000';
            const cleanBase = base.replace(/\/$/, '');
            
            // Fetch courts
            const courtsRes = await fetch(`${cleanBase}/diningcourts`);
            const courtsJson = await courtsRes.json();
            if (mounted && courtsJson.ok) {
              const list = courtsJson.courts.map((c:string) => ({ label: c, value: c }));
              setCourts(list);
            }
            
            // Fetch meal types
            const typesRes = await fetch(`${cleanBase}/mealtypes`);
            const typesJson = await typesRes.json();
            if (mounted && typesJson.ok) {
              const typesList = typesJson.mealTypes.map((t:string) => ({ label: t, value: t }));
              setMealTypes(typesList);
            }
          } catch (e) {
            console.warn('Failed to load dining courts or meal types', e);
          } finally {
            setLoadingCourts(false);
          }
        })();
        return () => { mounted = false; };
      }, []);

      // When a dining court or meal type is selected, fetch its menu items
      useEffect(() => {
        let mounted = true;
        (async () => {
          if (!selectedCourt) return setItems([]);
          try {
            setLoadingItems(true);
            const base = 'http://100.69.156.199:3000';
            const cleanBase = base.replace(/\/$/, '');
            let url = `${cleanBase}/menu?court=${encodeURIComponent(selectedCourt)}`;
            if (selectedMealType) {
              url += `&mealType=${encodeURIComponent(selectedMealType)}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            if (!mounted) return;
            if (json.ok) {
              // Backend already deduplicates and adds unique values, just use the items directly
              setItems(json.items || []);
            } else {
              setItems([]);
            }
          } catch (e) {
            console.warn('Failed to load menu items', e);
            setItems([]);
          } finally {
            setLoadingItems(false);
          }
        })();
        return () => { mounted = false; };
      }, [selectedCourt, selectedMealType]);
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Manual Logging Page</Text>

        <View style={[styles.dropdownContainer, { zIndex: 3000 }]}>
          <Text style={{marginBottom:8}}>Dining Court</Text>
          <DropDownPicker
            open={openCourt}
            value={selectedCourt}
            items={courts}
            setOpen={(open) => {
              setOpenCourt(open);
              if (open) {
                setOpenMealType(false);
                setOpenItem(false);
              }
            }}
            setValue={(v:any) => {
              const resolved = typeof v === 'function' ? (v as Function)(selectedCourt) : v;
              setSelectedCourt(resolved as string);
              setItemValue(null);
            }}
            setItems={setCourts}
            placeholder={loadingCourts ? 'Loading courts...' : 'Select dining court'}
            style={styles.hallPicker}
            dropDownContainerStyle={styles.dropDownContainer}
            zIndex={3000}
            zIndexInverse={1000}
          />
        </View>

        <View style={[styles.dropdownContainer, { zIndex: 2000 }]}>
          <Text style={{marginTop:16, marginBottom:8}}>Meal Type</Text>
          <DropDownPicker
            open={openMealType}
            value={selectedMealType}
            items={mealTypes}
            setOpen={(open) => {
              setOpenMealType(open);
              if (open) {
                setOpenCourt(false);
                setOpenItem(false);
              }
            }}
            setValue={(v:any) => {
              const resolved = typeof v === 'function' ? (v as Function)(selectedMealType) : v;
              setSelectedMealType(resolved as string);
              setItemValue(null);
            }}
            setItems={setMealTypes}
            placeholder="Select meal type (optional)"
            style={styles.hallPicker}
            dropDownContainerStyle={styles.dropDownContainer}
            zIndex={2000}
            zIndexInverse={2000}
          />
        </View>

        <View style={[styles.dropdownContainer, { zIndex: 1000 }]}>
          <Text style={{marginTop:16, marginBottom:8}}>Select an item</Text>
          <DropDownPicker
            open={openItem}
            value={itemValue}
            items={items}
            setOpen={(open) => {
              setOpenItem(open);
              if (open) {
                setOpenCourt(false);
                setOpenMealType(false);
              }
            }}
            setValue={setItemValue}
            setItems={setItems}
            onSelectItem={(it:any) => {
              if (it?.label) {
                setSelectedFoodName(it.label); // Store the actual food name from label
              }
              if (it?.servingSize) {
                setServingSize(it.servingSize);
                setQuantity('1');
              }
            }}
            placeholder={loadingItems ? 'Loading items...' : 'Select item'}
            style={styles.hallPicker}
            dropDownContainerStyle={[styles.dropDownContainer, { maxHeight: 350 }]}
            listMode="MODAL"
            modalTitle="Select an item"
            modalProps={{ presentationStyle: 'fullScreen' }}
            searchable={true}
            searchPlaceholder="Search items..."
            zIndex={1000}
            zIndexInverse={3000}
          />
        </View>

    <View style={styles.quantityContainer}>
      <Text style={styles.quantityLabel}>Servings ({servingSize}):</Text>
      <TextInput
        style={styles.quantityInput}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        placeholder="1"
        placeholderTextColor="#666"
      />
    </View>

    <TouchableOpacity
      style={styles.submitButton}
      onPress={async () => {
        if (itemValue && quantity && selectedFoodName) {
          try {
            const servings = parseFloat(quantity);
            if (Number.isNaN(servings) || servings <= 0) {
              Alert.alert('Invalid servings', 'Please enter a positive number');
              return;
            }

            // Send servings and the serving label to the API; backend will convert servings to grams.
            const result = await calculateNutrition(
              selectedFoodName,
              servings,
              'serving',
              false,
              undefined,
              servingSize
            );
            setNutritionResult(result as NutritionResult);
          } catch (err:any) {
            Alert.alert('Error', err.message || 'Failed to fetch nutrition');
          }
        }
      }}
    >
      <Text style={styles.submitButtonText}>Calculate Nutrition</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.submitButton, {marginTop:10}]}
      onPress={async () => {
  if (!nutritionResult) { Alert.alert('No data', 'Calculate nutrition first'); return; }
        try {
          const itemsToSave = [{ food: nutritionResult.food, amount: Number(quantity), unit: 'serving', servingLabel: servingSize, calories: Number(nutritionResult.calories), protein: Number(nutritionResult.protein), carbs: Number(nutritionResult.carbs), fat: Number(nutritionResult.fat) }];
          const totals = { calories: Number(nutritionResult.calories), protein: Number(nutritionResult.protein), carbs: Number(nutritionResult.carbs), fat: Number(nutritionResult.fat) };

          // Save detailed meal (existing behavior)
          await saveMealToDatabase(itemsToSave, totals);

          // Save to usermeals table using the user's email as id (must exist in users table)
          const userEmail = 'test@purdue.edu'; // TODO: replace with logged-in user's email
          await saveUserMeal({
            userId: userEmail,
            diningCourt: selectedCourt,
            mealType: selectedMealType || 'lunch',
            foodName: nutritionResult.food,
            servings: Number(quantity),
            servingLabel: servingSize
          });

          Alert.alert('Saved', 'Meal saved');
        } catch (err:any) { Alert.alert('Save failed', err.message || ''); }
      }}
    >
      <Text style={styles.submitButtonText}>Save Meal</Text>
    </TouchableOpacity>

    {nutritionResult && (
      <View style={styles.nutritionResult}>
        <Text style={styles.nutritionText}>Nutrition Information:</Text>
        <Text>Calories: {nutritionResult.calories}</Text>
        <Text>Protein: {nutritionResult.protein}g</Text>
        <Text>Carbs: {nutritionResult.carbs}g</Text>
        <Text>Fat: {nutritionResult.fat}g</Text>
      </View>
    )}

      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CEB888',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dropdownContainer: {
    marginBottom: 20,
    width: 300,
  },
  dropDownContainer: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 50,
  },
  hallPicker: {
    marginBottom: 10,
    width: 300,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    width: 300,
  },
  quantityLabel: {
    fontSize: 16,
    marginRight: 10,
  },
    quantityInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    width: 120,
    fontSize: 16,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#000000',
    padding: 15,
    borderRadius: 10,
    width: 300,
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nutritionResult: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 300,
    marginBottom: 300,
  },
  nutritionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});