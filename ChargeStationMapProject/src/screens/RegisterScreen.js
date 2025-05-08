import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/theme';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      // TODO: Show error message
      return;
    }

    if (password !== confirmPassword) {
      // TODO: Show password mismatch error
      return;
    }

    try {
      setIsLoading(true);
      // TODO: Implement register logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      navigation.navigate('Home');
    } catch (error) {
      // TODO: Handle error
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.pop();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Merhaba</Text>
          <Text style={styles.title}>Hesap Oluştur</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            value={name}
            onChangeText={setName}
            placeholderTextColor={COLORS.gray}
          />

          <TextInput
            style={styles.input}
            placeholder="E-posta"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={COLORS.gray}
          />

          <TextInput
            style={styles.input}
            placeholder="Şifre"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={COLORS.gray}
          />

          <TextInput
            style={styles.input}
            placeholder="Şifre Tekrar"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholderTextColor={COLORS.gray}
          />

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Hesap Oluştur</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={goToLogin}>
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    marginBottom: 48,
  },
  welcomeText: {
    fontSize: 20,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  form: {
    flex: 1,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  registerButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  dividerText: {
    color: COLORS.gray,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  loginButton: {
    height: 56,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegisterScreen; 