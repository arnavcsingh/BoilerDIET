import { Camera, CameraView } from "expo-camera";
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ── Inference server URL ──────────────────────────────────────────────────────
const INFERENCE_SERVER_URL = (
  (global as any)?.NUTRITION_API_BASE ||
  process.env.EXPO_PUBLIC_NUTRITION_API_BASE ||
  'http://10.0.2.2:3000'
).replace(/\/$/, '');
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CIRCLE_SIZE = SCREEN_WIDTH * 0.8;

const MEAL_TYPES = ['Breakfast', 'Brunch', 'Lunch', 'Late Lunch', 'Dinner'];

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<'back' | 'front'>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // ── Dining context setup modal ──────────────────────────────────────────────
  const [showSetupModal, setShowSetupModal] = useState(true);
  const [courts, setCourts] = useState<string[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>('Lunch');
  // ─────────────────────────────────────────────────────────────────────────────

  // Fetch dining courts on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${INFERENCE_SERVER_URL}/diningcourts`);
        const json = await res.json();
        if (json.ok && Array.isArray(json.courts)) {
          setCourts(json.courts);
        }
      } catch (e) {
        console.warn('Failed to load dining courts', e);
      } finally {
        setLoadingSetup(false);
      }
    })();
  }, []);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const toggleCameraType = () => {
    setType(prevType => (prevType === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhoto(photo.uri);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
  };

  // Save photo — POSTs image + dining context to classify, then navigates
  const savePhoto = async () => {
    if (!photo) return;

    setSubmitting(true);
    setError(null);

    try {
      const imageUri = photo.startsWith('file://') ? photo : `file://${photo}`;

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
      if (selectedCourt) {
        formData.append('court', selectedCourt);
      }
      formData.append('meal_type', selectedMealType);

      const response = await fetch(`${INFERENCE_SERVER_URL}/classify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      router.push({
        pathname: '/meal_information',
        params: {
          imageUri,
          classification: result.label ?? '',
          matches: JSON.stringify(result.matches ?? []),
          court: selectedCourt ?? '',
          mealType: selectedMealType,
        },
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to reach inference server');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  // Show captured photo with Save and Retake buttons
  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        <View style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={retakePhoto} disabled={submitting}>
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            <View style={{ width: 20 }} />
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={savePhoto} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#000" />
                : <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>}
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    );
  }

  // Camera view with circular frame overlay + dining setup modal
  return (
    <View style={styles.container}>
      {/* Dining context setup modal */}
      <Modal visible={showSetupModal} transparent animationType="slide">
        <View style={styles.setupOverlay}>
          <View style={styles.setupModal}>
            <Text style={styles.setupTitle}>Where are you eating?</Text>
            <Text style={styles.setupSubtitle}>This helps us find better matches for your food</Text>

            <Text style={styles.setupSectionLabel}>Dining Court</Text>
            {loadingSetup ? (
              <ActivityIndicator color="#CFB991" style={{ marginVertical: 12 }} />
            ) : (
              <ScrollView style={styles.setupList} showsVerticalScrollIndicator={false}>
                {courts.map((court) => (
                  <TouchableOpacity
                    key={court}
                    style={[styles.setupChoice, selectedCourt === court && styles.setupChoiceSelected]}
                    onPress={() => setSelectedCourt(court)}
                  >
                    <Text style={[styles.setupChoiceText, selectedCourt === court && styles.setupChoiceTextSelected]}>
                      {court}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.setupSectionLabel}>Meal Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealTypeRow}>
              {MEAL_TYPES.map((mt) => (
                <TouchableOpacity
                  key={mt}
                  style={[styles.mealTypeChip, selectedMealType === mt && styles.mealTypeChipSelected]}
                  onPress={() => setSelectedMealType(mt)}
                >
                  <Text style={[styles.mealTypeChipText, selectedMealType === mt && styles.mealTypeChipTextSelected]}>
                    {mt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.setupButtonRow}>
              <TouchableOpacity
                style={styles.setupSkipButton}
                onPress={() => { setSelectedCourt(null); setShowSetupModal(false); }}
              >
                <Text style={styles.setupSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.setupContinueButton, !selectedCourt && styles.setupContinueButtonDisabled]}
                onPress={() => { if (selectedCourt) setShowSetupModal(false); }}
                disabled={!selectedCourt}
              >
                <Text style={styles.setupContinueText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CameraView style={styles.camera} facing={type} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.circleFrame}>
              <View style={styles.circleBorder} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>Center the plate in the circle</Text>
          </View>
        </View>
      </CameraView>

      {/* Context badge */}
      {selectedCourt ? (
        <TouchableOpacity style={styles.contextBadge} onPress={() => setShowSetupModal(true)}>
          <Text style={styles.contextBadgeText}>{selectedCourt} · {selectedMealType}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePicture}>
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
        <View style={{ height: 10 }} />
        <TouchableOpacity style={styles.button} onPress={toggleCameraType}>
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#000000",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  saveButton: {
    backgroundColor: "#CFB991", // Gold/tan color for save button
  },
  saveButtonText: {
    color: "#000000",
  },
  buttonText: {
    color: "#CFB991",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  errorText: {
    color: "#ff4444",
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
  },
  // Circular frame overlay styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: CIRCLE_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  circleFrame: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBorder: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    borderColor: '#CFB991',
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  instructionContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instructionText: {
    color: '#CFB991',
    fontSize: 16,
    fontWeight: '600',
  },
  // Dining setup modal styles
  setupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  setupModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  setupTitle: {
    color: '#CFB991',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  setupSubtitle: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  setupSectionLabel: {
    color: '#CFB991',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  setupList: {
    maxHeight: 220,
    marginBottom: 12,
  },
  setupChoice: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#2a2a2a',
  },
  setupChoiceSelected: {
    backgroundColor: '#CFB991',
  },
  setupChoiceText: {
    color: '#fff',
    fontSize: 15,
  },
  setupChoiceTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  mealTypeRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  mealTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  mealTypeChipSelected: {
    backgroundColor: '#CFB991',
  },
  mealTypeChipText: {
    color: '#fff',
    fontSize: 13,
  },
  mealTypeChipTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
  setupButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  setupSkipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  setupSkipText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  setupContinueButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#CFB991',
    alignItems: 'center',
  },
  setupContinueButtonDisabled: {
    backgroundColor: '#555',
  },
  setupContinueText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  contextBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(207, 185, 145, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  contextBadgeText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
});