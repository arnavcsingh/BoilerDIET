import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';

interface NutritionData {
  calories: number;
  totalFat: number;
  saturatedFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  sugar: number;
  addedSugar: number;
  dietaryFiber: number;
  protein: number;
  calcium: number;
  iron: number;
}

interface Props {
  route: {
    params: {
      itemId: string;
    };
  };
}

const NutritionDetails: React.FC<Props> = ({ route }) => {
  const { itemId } = route.params;
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://localhost:5001/api/nutrition/${itemId}`)
      .then((response) => {
        setNutrition(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching nutrition details:", error);
        setLoading(false);
      });
  }, [itemId]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.caloriesTitle}>Calories <Text style={styles.caloriesValue}>{nutrition.calories}</Text></Text>

      <View style={styles.separator} />

      {renderRow('Total Fat', `${nutrition.totalFat}g`, '13%')}
      {renderSubRow('Saturated Fat', `${nutrition.saturatedFat}g`, '5%')}
      {renderRow('Cholesterol', `${nutrition.cholesterol}mg`, '12%')}
      {renderRow('Sodium', `${nutrition.sodium}mg`, '31%')}
      {renderRow('Total Carbohydrate', `${nutrition.totalCarbs}g`, '4%')}
      {renderSubRow('Sugar', `${nutrition.sugar}g`)}
      {renderSubRow('Added Sugar', `${nutrition.addedSugar}g`)}
      {renderSubRow('Dietary Fiber', `${nutrition.dietaryFiber}g`)}
      {renderRow('Protein', `${nutrition.protein}g`, '14%')}
      {renderRow('Calcium', `${nutrition.calcium}%`, '4%')}
      {renderRow('Iron', `${nutrition.iron}%`, '10%')}
    </ScrollView>
  );
};

const renderRow = (label: string, value: string, percent?: string) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.rightSide}>
      <Text style={styles.value}>{value}</Text>
      {percent && <Text style={styles.percent}>{percent}</Text>}
    </View>
  </View>
);

const renderSubRow = (label: string, value: string, percent?: string) => (
  <View style={styles.subRow}>
    <Text style={styles.subLabel}>{label}</Text>
    <View style={styles.rightSide}>
      <Text style={styles.value}>{value}</Text>
      {percent && <Text style={styles.percent}>{percent}</Text>}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: '#b22222',
    fontSize: 16,
  },
  caloriesTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  caloriesValue: {
    fontSize: 40,
    color: '#000',
  },
  separator: {
    height: 2,
    backgroundColor: '#d4af37',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingLeft: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  subLabel: {
    fontSize: 15,
    color: '#444',
  },
  rightSide: {
    flexDirection: 'row',
    gap: 10,
  },
  value: {
    fontSize: 15,
    color: '#000',
  },
  percent: {
    fontSize: 15,
    color: '#d4af37',
    fontWeight: 'bold',
  },
});

export default NutritionDetails;
