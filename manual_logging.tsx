import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { calculateNutrition } from './components/db-nutrition-calc';

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
  const [open, setOpen] = useState(false);
    const [value, setValue] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);
    const [items, setItems] = useState([
      { label: 'scrambled eggs', value: '1' },
      { label: 'pancakes', value: '2' },
      { label: 'rice', value: '3' },
      { label: 'grilled cheese', value: '4' },
      { label: 'pork potstickers', value: '5' },
    ]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manual Logging Page</Text>

      <DropDownPicker
      open={open}
      value={value}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      setItems={setItems}
      style={styles.hallPicker}
    />

    <View style={styles.quantityContainer}>
      <Text style={styles.quantityLabel}>Quantity:</Text>
      <TextInput
        style={styles.quantityInput}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        placeholder="Enter Grams"
        placeholderTextColor="#666"
      />
    </View>

    <TouchableOpacity
      style={styles.submitButton}
      onPress={async () => {
        if (value && quantity) {
          const selectedFood = items.find(item => item.value === value)?.label;
          if (selectedFood) {
            const result = await calculateNutrition(selectedFood, parseInt(quantity), "g", true);
            setNutritionResult(result);
          }
        }
      }}
    >
      <Text style={styles.submitButtonText}>Calculate Nutrition</Text>
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
  );
}
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CEB888',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 50,
  },
    hallPicker: {
    marginBottom: 50,
    marginRight: 50,
    marginLeft: 50,
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