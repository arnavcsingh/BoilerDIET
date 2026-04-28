import { Camera, CameraView } from "expo-camera";
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// ── Inference server URL ──────────────────────────────────────────────────────
// Routes /classify through the Node API server (same host the app already uses).
// Override with EXPO_PUBLIC_NUTRITION_API_BASE env var for production deployments.
const INFERENCE_SERVER_URL = (
  (global as any)?.NUTRITION_API_BASE ||
  process.env.EXPO_PUBLIC_NUTRITION_API_BASE ||
  'http://10.0.2.2:3000'
).replace(/\/$/, '');
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CIRCLE_SIZE = SCREEN_WIDTH * 0.8; // 80% of screen width

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<'back' | 'front'>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // Flipping the camera
  const toggleCameraType = () => {
    setType(prevType => (prevType === 'back' ? 'front' : 'back'));
  };

  // Take photo function
  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setPhoto(photo.uri);
    }
  };

  // Retake photo function
  const retakePhoto = () => {
    setPhoto(null);
  };

  // Save photo function — POSTs image to inference server, then navigates
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

      const response = await fetch(`${INFERENCE_SERVER_URL}/classify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      // result expected shape: { label: string, matches: string[] }

      router.push({
        pathname: '/meal_information',
        params: {
          imageUri,
          classification: result.label ?? '',
          matches: JSON.stringify(result.matches ?? []),
        },
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to reach inference server');
    } finally {
      setSubmitting(false);
    }
  };

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

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

  // Camera view with circular frame overlay
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={type} ref={cameraRef}>
        {/* Circular Frame Overlay */}
        <View style={styles.overlay}>
          {/* Top dark overlay */}
          <View style={styles.overlayTop} />
          
          {/* Middle row with circle cutout */}
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.circleFrame}>
              <View style={styles.circleBorder} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          
          {/* Bottom dark overlay */}
          <View style={styles.overlayBottom} />
          
          {/* Helper text */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>Center the plate in the circle</Text>
          </View>
        </View>
      </CameraView>

      {/* Camera controls */}
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
});