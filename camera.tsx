
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
import React, { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  //const [type, setType] = useState<CameraType>('back');
  const [type, setType] = useState<'back' | 'front'>('back');

  //flipping the camera
  const toggleCameraType = () => {
    setType(prevType => (prevType === 'back' ? 'front' : 'back'));
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
  

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={type} />
      <View style={styles.buttonContainer}>
        <Button title="Flip Camera" onPress={toggleCameraType} />
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
  buttonContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
  },
});
