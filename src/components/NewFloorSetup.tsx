import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, radius } from '../theme';

interface NewFloorSetupProps {
  onCreate: (widthFt: number, heightFt: number, name: string) => void;
}

export default function NewFloorSetup({ onCreate }: NewFloorSetupProps) {
  const [name, setName] = useState('Ground Floor');
  const [width, setWidth] = useState('30');
  const [height, setHeight] = useState('20');

  const [errors, setErrors] = useState<{ name?: string; width?: string; height?: string }>({});

  const handleCreate = () => {
    const newErrors: typeof errors = {};

    // 1. Clean and validate Name
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Floor name is required';
    }

    // 2. Validate Width
    const wNum = Number(width);
    if (isNaN(wNum) || wNum <= 0) {
      newErrors.width = 'Must be a positive number';
    } else if (wNum < 10) {
      newErrors.width = 'Min width is 10ft';
    }

    // 3. Validate Height
    const hNum = Number(height);
    if (isNaN(hNum) || hNum <= 0) {
      newErrors.height = 'Must be a positive number';
    } else if (hNum < 10) {
      newErrors.height = 'Min height is 10ft';
    }

    // If there are validation errors, block submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Validation success: send sanitized values
    onCreate(wNum, hNum, trimmedName);
  };

  return (
    <KeyboardAvoidingView
      style={styles.setupContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.setupCard}>
        <Text style={styles.setupEmoji}>🍽️</Text>
        <Text style={styles.setupTitle}>Create Your Floor</Text>
        <Text style={styles.setupSubtitle}>
          Enter details to design your restaurant table layout module.
        </Text>

        {/* Floor Name input field */}
        <View style={{ width: '100%', marginBottom: spacing.md }}>
          <Text style={styles.setupLabel}>Floor Name</Text>
          <TextInput
            style={[styles.setupInput, errors.name && styles.setupInputError]}
            value={name}
            onChangeText={(txt) => {
              setName(txt);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Ground Floor"
            placeholderTextColor={colors.textMuted}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Width and Height input fields */}
        <View style={styles.setupRow}>
          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>Width (ft)</Text>
            <TextInput
              style={[styles.setupInput, errors.width && styles.setupInputError]}
              value={width}
              onChangeText={(txt) => {
                // Strip negative signs and non-numeric characters immediately
                const sanitized = txt.replace(/[^0-9.]/g, '');
                setWidth(sanitized);
                setErrors((prev) => ({ ...prev, width: undefined }));
              }}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textMuted}
            />
            {errors.width && <Text style={styles.errorText}>{errors.width}</Text>}
          </View>
          <View style={styles.setupField}>
            <Text style={styles.setupLabel}>Height (ft)</Text>
            <TextInput
              style={[styles.setupInput, errors.height && styles.setupInputError]}
              value={height}
              onChangeText={(txt) => {
                const sanitized = txt.replace(/[^0-9.]/g, '');
                setHeight(sanitized);
                setErrors((prev) => ({ ...prev, height: undefined }));
              }}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.textMuted}
            />
            {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
          </View>
        </View>

        <Pressable style={styles.setupButton} onPress={handleCreate}>
          <Text style={styles.setupButtonText}>Create Floor</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  setupContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  setupCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  setupEmoji: { fontSize: 40, marginBottom: spacing.sm },
  setupTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  setupSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  setupRow: { flexDirection: 'row', gap: spacing.md, width: '100%', marginBottom: spacing.lg },
  setupField: { flex: 1 },
  setupLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  setupInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  setupInputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  setupButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  setupButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
