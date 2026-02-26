import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUp } from '@/services/api';
import { AuthInput } from '@/components/AuthInput';
import { AuthButton } from '@/components/AuthButton';
import { Captcha } from '@/components/Captcha';
import { CountryPicker } from '@/components/CountryPicker';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);
  const [captchaUserAnswer, setCaptchaUserAnswer] = useState('');
  const [captchaCorrectAnswer, setCaptchaCorrectAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCaptchaAnswerChange = useCallback((userAnswer: string, correctAnswer: string) => {
    setCaptchaUserAnswer(userAnswer);
    setCaptchaCorrectAnswer(correctAnswer);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!email || !fullName || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    if (!country) {
      Alert.alert('Error', 'Please select a country.');
      return;
    }

    if (!isCaptchaValid) {
      Alert.alert('Error', 'Please solve the math problem correctly.');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'You must accept the Terms of Service and Privacy Policy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp({
        email: email.trim(),
        name: fullName.trim(),
        password,
        country,
        terms: termsAccepted,
        captcha: captchaUserAnswer,
        captchaAnswer: captchaCorrectAnswer,
      });

      if (result.success !== false) {
        Alert.alert('Success', 'Account created successfully! Please sign in.');
        router.replace('/(auth)/sign-in');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    email, fullName, password, confirmPassword, country,
    termsAccepted, isCaptchaValid, captchaUserAnswer, captchaCorrectAnswer, router,
  ]);

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
            <Text style={styles.heading}>Create your account</Text>

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
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              placeholder="Your full name"
            />

            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Min 8 characters"
            />

            <AuthInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Re-enter your password"
            />

            <CountryPicker value={country} onSelect={setCountry} />

            <Captcha
              onValidate={setIsCaptchaValid}
              onAnswerChange={handleCaptchaAnswerChange}
            />

            <View style={styles.termsRow}>
              <Switch
                value={termsAccepted}
                onValueChange={setTermsAccepted}
                trackColor={{ false: '#3F3F46', true: '#3B82F6' }}
              />
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.linkText}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>.
              </Text>
            </View>

            <AuthButton
              title={isSubmitting ? 'Creating account...' : 'Create account'}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || !isCaptchaValid || !termsAccepted}
            />

            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text
                style={styles.linkText}
                onPress={() => router.push('/(auth)/sign-in')}
              >
                Sign in
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
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  termsText: { color: '#9BA1A6', fontSize: 13, flex: 1 },
  linkText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  footerText: { color: '#9BA1A6', fontSize: 14, textAlign: 'center' },
});
