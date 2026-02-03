import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const getApiBase = () => {
  const fromGlobal = (global as any)?.NUTRITION_API_BASE;
  const fromEnv = process.env.EXPO_PUBLIC_NUTRITION_API_BASE;
  const base = (fromGlobal || fromEnv || 'http://10.0.2.2:3000').replace(/\/$/, '');
  return base;
};

//Main login page
export default function LoginPage() {
  const router = useRouter(); // switch between pages
  // email/username and password components of login feature
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      const url = `${getApiBase()}/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Invalid email or password. Please try again.');

      console.log('Login successful with:', email);
      router.push('/');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed. Please try again.');
    }
  };

  // Function to navigate to sign up page
  const handleSignUp = () => {
    router.push('/signup');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* App Title */}
          <Text style={styles.titleText}>Boiler DIET</Text>
          <Text style={styles.descText}>(Dining Image & Evaluation Tracker)</Text>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.loginTitle}>Login</Text>
          {/*Style of the username and password input boxes*/}
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            {/* Sign Up Link - small text at bottom */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CEB888', //full screen is gold
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: { //centers items vertically and horizontally on the page
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  titleText: { //style of the Boiler DIET name
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 60,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  }, //login header inside the form style
  loginTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 30,
    textAlign: 'center',
  }, //style of the input field
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  }, //style of the login button
  loginButton: {
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20, // Added space before sign up link
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Style for the "Don't have an account?" container
  signupContainer: {
    flexDirection: 'row', // Put text and link side by side
    justifyContent: 'center', // Center horizontally
    alignItems: 'center', // Center vertically
  },
  // Style for "Don't have an account?" text
  signupText: {
    fontSize: 12, // Small font size
    color: '#666', // Gray color
  },
  // Style for "Sign Up" clickable link
  signupLink: {
    fontSize: 12, // Small font size
    color: '#000', // Black color
    fontWeight: 'bold', // Make it bold
    textDecorationLine: 'underline', // Underline to show it's clickable
  },
});