
// import { Link } from 'expo-router';
// import { StyleSheet } from 'react-native';

// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';

// export default function ModalScreen() {
//   return (
//     <ThemedView style={styles.container}>
//       <ThemedText type="title">This is a modal</ThemedText>
//       <Link href="/" dismissTo style={styles.link}>
//         <ThemedText type="link">Go to home screen</ThemedText>
//       </Link>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   link: {
//     marginTop: 15,
//     paddingVertical: 15,
//   },
// });


import { Camera, CameraView } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<'back' | 'front'>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  //flipping the camera
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

  // Show captured photo
  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={retakePhoto}>
            <Text style={styles.buttonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  //button operations
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={type} ref={cameraRef} />
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
//details on button style
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
  button: {
    backgroundColor: "#000000",  // Changed to black
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: "#CFB991",  // Kept the same
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});