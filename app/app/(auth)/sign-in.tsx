import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { signIn } from '@/services/api';
import { AuthInput } from '@/components/AuthInput';
import { AuthButton } from '@/components/AuthButton';

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn({ email: email.trim(), password, remember });
      if (result.token && result.user) {
        await login(result.user, result.token, remember);
        // Navigation is handled by the root layout auth redirect
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, remember, login]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text style={styles.logo}>NoBullFit</Text>
            <Text style={styles.heading}>Sign in to your account</Text>

            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />

            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              placeholder="Your password"
            />

            <View style={styles.row}>
              <View style={styles.rememberRow}>
                <Switch
                  value={remember}
                  onValueChange={setRemember}
                  trackColor={{ false: '#3F3F46', true: '#3B82F6' }}
                />
                <Text style={styles.rememberText}>Remember me</Text>
              </View>
              <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>
            </View>

            <AuthButton
              title={isSubmitting ? 'Signing in...' : 'Sign In'}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            />

            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text
                style={styles.linkText}
                onPress={() => router.push('/(auth)/sign-up')}
              >
                Sign up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#151718' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  form: { gap: 20, width: '100%', maxWidth: 400, alignSelf: 'center' },
  logo: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '600', color: '#ECEDEE', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberText: { color: '#ECEDEE', fontSize: 14 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  footerText: { color: '#9BA1A6', fontSize: 14, textAlign: 'center' },
});
