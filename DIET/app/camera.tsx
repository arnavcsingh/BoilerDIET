import { StyleSheet, Text, View } from 'react-native';

export default function Camera() {
    return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Camera</Text>
    </View>
    );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CEB888',
  },
  titleText: {
    marginTop: 100,
    fontSize: 40,
    fontWeight: 'bold',
  },
});