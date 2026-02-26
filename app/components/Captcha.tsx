import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
  onAnswerChange: (userAnswer: string, correctAnswer: string) => void;
}

// Generate a simple math problem
function generateMathProblem(): { question: string; answer: number } {
  const operations = ['+', '-'];
  const operation = operations[Math.floor(Math.random() * operations.length)];

  let num1: number;
  let num2: number;
  let answer: number;

  if (operation === '+') {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    answer = num1 + num2;
  } else {
    num1 = Math.floor(Math.random() * 10) + 11;
    num2 = Math.floor(Math.random() * num1) + 1;
    answer = num1 - num2;
  }

  return { question: `${num1} ${operation} ${num2}`, answer };
}

export function Captcha({ onValidate, onAnswerChange }: CaptchaProps) {
  const [problem, setProblem] = useState(() => generateMathProblem());
  const [userAnswer, setUserAnswer] = useState('');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const errorColor = useThemeColor({}, 'error');
  const placeholderColor = useThemeColor({}, 'placeholder');

  useEffect(() => {
    const parsed = parseInt(userAnswer.trim(), 10);
    const valid = !isNaN(parsed) && parsed === problem.answer;
    onValidate(valid);
    onAnswerChange(userAnswer, problem.answer.toString());
  }, [userAnswer, problem.answer, onValidate, onAnswerChange]);

  const handleRefresh = useCallback(() => {
    setProblem(generateMathProblem());
    setUserAnswer('');
    onValidate(false);
  }, [onValidate]);

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: textColor }]}>
          What is {problem.question}?
        </Text>
        <Pressable onPress={handleRefresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
        value={userAnswer}
        onChangeText={setUserAnswer}
        placeholder="Enter your answer"
        placeholderTextColor={placeholderColor}
        keyboardType="number-pad"
        returnKeyType="done"
      />
      {userAnswer !== '' && parseInt(userAnswer.trim(), 10) !== problem.answer ? (
        <Text style={[styles.errorText, { color: errorColor }]}>
          Incorrect answer. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  refreshText: { fontSize: 13, color: '#3B82F6', textDecorationLine: 'underline' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  errorText: { fontSize: 13, marginTop: 4 },
});
