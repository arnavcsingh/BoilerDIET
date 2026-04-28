import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Modal, TextInput, ScrollView } from 'react-native';
import { updateUserProfile, getUserData } from './components/db-users';

const ALLERGEN_OPTIONS = ['Eggs', 'Gluten', 'Milk', 'Soy', 'Vegetarian', 'Wheat', 'Sesame', 'Vegan'];

export default function ProfileScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [proteinGoal, setProteinGoal] = useState<number>(50);
  const [carbsGoal, setCarbsGoal] = useState<number>(275);
  const [fatGoal, setFatGoal] = useState<number>(78);
  const [allergens, setAllergens] = useState<string>('');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPasswordValue, setCurrentPasswordValue] = useState('');
  const [newPasswordValue, setNewPasswordValue] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        setUserId(storedUserId);
        
        if (storedUserId) {
          const userData = await getUserData(storedUserId);
          setFirstName(userData.firstName || null);
          setLastName(userData.lastName || null);
          setEmail(userData.email || null);
          setProteinGoal(userData.proteinGoal || 50);
          setCarbsGoal(userData.carbsGoal || 275);
          setFatGoal(userData.fatGoal || 78);
          setAllergens(userData.allergens || '');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
    if (field === 'allergens') {
      const currentSelected = allergens ? allergens.split(',').map(a => a.trim()) : [];
      setSelectedAllergens(currentSelected);
    }
  };

  const handleSaveEdit = async () => {
    if (!userId || !editingField) return;

    try {
      if (editingField === 'password') {
        if (!currentPasswordValue.trim() || !newPasswordValue.trim()) return;
        
        await updateUserProfile(userId, firstName || '', lastName || '', email || '', newPasswordValue, currentPasswordValue, proteinGoal, carbsGoal, fatGoal, allergens);
      } else if (editingField === 'allergens') {
        const allergenString = selectedAllergens.join(',');
        setAllergens(allergenString);
        await updateUserProfile(userId, firstName || '', lastName || '', email || '', undefined, undefined, proteinGoal, carbsGoal, fatGoal, allergenString);
      } else {
        if (!editValue.trim()) return;

        let newFirstName = firstName;
        let newLastName = lastName;
        let newEmail = email;
        let newProteinGoal = proteinGoal;
        let newCarbsGoal = carbsGoal;
        let newFatGoal = fatGoal;

        if (editingField === 'firstName') {
          newFirstName = editValue;
          setFirstName(editValue);
        } else if (editingField === 'lastName') {
          newLastName = editValue;
          setLastName(editValue);
        } else if (editingField === 'email') {
          newEmail = editValue;
          setEmail(editValue);
          await AsyncStorage.setItem('userEmail', editValue);
        } else if (editingField === 'proteinGoal') {
          newProteinGoal = parseInt(editValue) || 60;
          setProteinGoal(newProteinGoal);
        } else if (editingField === 'carbsGoal') {
          newCarbsGoal = parseInt(editValue) || 60;
          setCarbsGoal(newCarbsGoal);
        } else if (editingField === 'fatGoal') {
          newFatGoal = parseInt(editValue) || 77;
          setFatGoal(newFatGoal);
        }
        
        await updateUserProfile(userId, newFirstName || '', newLastName || '', newEmail || '', undefined, undefined, newProteinGoal, newCarbsGoal, newFatGoal, allergens);
      }
      
      setEditingField(null);
      setCurrentPasswordValue('');
      setNewPasswordValue('');
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
    setCurrentPasswordValue('');
    setNewPasswordValue('');
    setSelectedAllergens([]);
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Profile</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>First Name:</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{firstName || 'Not set'}</Text>
            <TouchableOpacity onPress={() => handleEdit('firstName', firstName || '')}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Last Name:</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{lastName || 'Not set'}</Text>
            <TouchableOpacity onPress={() => handleEdit('lastName', lastName || '')}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{email || 'Not set'}</Text>
            <TouchableOpacity onPress={() => handleEdit('email', email || '')}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Password:</Text>
          <TouchableOpacity onPress={() => handleEdit('password', '')}>
            <Text style={styles.editButton}>Change</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Protein Goal (g):</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{proteinGoal}</Text>
            <TouchableOpacity onPress={() => handleEdit('proteinGoal', proteinGoal.toString())}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Carbs Goal (g):</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{carbsGoal}</Text>
            <TouchableOpacity onPress={() => handleEdit('carbsGoal', carbsGoal.toString())}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Fat Goal (g):</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{fatGoal}</Text>
            <TouchableOpacity onPress={() => handleEdit('fatGoal', fatGoal.toString())}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Allergens:</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.value}>{allergens || 'None'}</Text>
            <TouchableOpacity onPress={() => handleEdit('allergens', allergens)}>
              <Text style={styles.editButton}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{userId || 'Not set'}</Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>

      {/* Displays the modal to edit user profile fields */}
      <Modal visible={editingField !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {editingField ? editingField.charAt(0).toUpperCase() + editingField.slice(1) : ''}</Text>
            {editingField === 'password' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter current password"
                  value={currentPasswordValue}
                  onChangeText={setCurrentPasswordValue}
                  secureTextEntry
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter new password"
                  value={newPasswordValue}
                  onChangeText={setNewPasswordValue}
                  secureTextEntry
                />
              </>
            ) : editingField === 'allergens' ? (
              <ScrollView style={styles.allergenContainer}>
                {ALLERGEN_OPTIONS.map(allergen => (
                  <TouchableOpacity
                    key={allergen}
                    style={styles.allergenOption}
                    onPress={() => toggleAllergen(allergen)}
                  >
                    <View style={[styles.checkbox, selectedAllergens.includes(allergen) && styles.checkboxSelected]}>
                      {selectedAllergens.includes(allergen) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.allergenLabel}>{allergen}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TextInput
                style={styles.modalInput}
                placeholder={`Enter ${editingField}`}
                value={editValue}
                onChangeText={setEditValue}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => editingField !== null && handleSaveEdit()}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CEB888',
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000000',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 30,
  },
  infoRow: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#000000',
  },
  editButton: {
    fontSize: 14,
    color: '#CEB888',
    fontWeight: '600',
  },
  backButton: {
    padding: 15,
    backgroundColor: '#000000ff',
    borderRadius: 10,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
  allergenContainer: {
    maxHeight: 250,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
  },
  allergenOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#CEB888',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#CEB888',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  allergenLabel: {
    fontSize: 16,
    color: '#000000',
  },

});
