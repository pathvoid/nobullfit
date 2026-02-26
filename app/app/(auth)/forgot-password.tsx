import { useState, useCallback } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '@/services/api';
import { AuthInput } from '@/components/AuthInput';
import { AuthButton } from '@/components/AuthButton';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSuccess(true);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email]);

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
            <Text style={styles.heading}>Reset your password</Text>

            {!success ? (
              <>
                <Text style={styles.description}>
                  Enter your email address and we'll send you a link to reset your password.
                </Text>

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

                <AuthButton
                  title={isSubmitting ? 'Sending...' : 'Send reset link'}
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />

                <Text style={styles.footerText}>
                  Remember your password?{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() => router.back()}
                  >
                    Sign in
                  </Text>
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.successText}>
                  If an account with that email exists, a password reset link has been sent.
                  Please check your email.
                </Text>

                <AuthButton
                  title="Back to Sign In"
                  onPress={() => router.replace('/(auth)/sign-in')}
                />
              </>
            )}
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
  description: { color: '#9BA1A6', fontSize: 14, textAlign: 'center' },
  successText: { color: '#22C55E', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  footerText: { color: '#9BA1A6', fontSize: 14, textAlign: 'center' },
});
