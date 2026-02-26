import { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { COUNTRIES } from '@/constants/Countries';

interface CountryPickerProps {
  value: string;
  onSelect: (country: string) => void;
  error?: string;
}

export function CountryPicker({ value, onSelect, error }: CountryPickerProps) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const textColor = useThemeColor({}, 'text');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const errorColor = useThemeColor({}, 'error');
  const background = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');

  const filtered = useMemo(() => {
    if (!search) return COUNTRIES;
    const lower = search.toLowerCase();
    return COUNTRIES.filter((c) => c.toLowerCase().includes(lower));
  }, [search]);

  const handleSelect = (country: string) => {
    onSelect(country);
    setVisible(false);
    setSearch('');
  };

  return (
    <View>
      <Text style={[styles.label, { color: textColor }]}>Country</Text>
      <Pressable
        style={[
          styles.pickerButton,
          {
            backgroundColor: inputBg,
            borderColor: error ? errorColor : inputBorder,
          },
        ]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.pickerText, { color: value ? textColor : placeholderColor }]}>
          {value || 'Select a country'}
        </Text>
      </Pressable>
      {error ? <Text style={[styles.error, { color: errorColor }]}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Select Country</Text>
            <Pressable onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.searchInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search countries..."
            placeholderTextColor={placeholderColor}
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.countryRow, { borderBottomColor: borderColor }]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.countryText, { color: textColor }, item === value && styles.selectedText]}>
                  {item}
                </Text>
              </Pressable>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: { fontSize: 16 },
  error: { fontSize: 13, marginTop: 4 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  cancelText: { fontSize: 16, color: '#3B82F6', fontWeight: '600' },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    fontSize: 16,
  },
  countryRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryText: { fontSize: 16 },
  selectedText: { color: '#3B82F6', fontWeight: '600' },
});
