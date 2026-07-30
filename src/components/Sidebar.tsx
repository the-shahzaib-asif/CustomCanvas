import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text, TextInput } from 'react-native';
import Svg, { Circle, Path, Rect, Defs, Pattern } from 'react-native-svg';
import { colors, spacing, radius, sizes } from '../theme';
import { SeaterType } from './CanvasElement';

interface SidebarProps {
  showTableMenu: boolean;
  onTablesPress: () => void;
  onSelectSeater: (seater: SeaterType) => void;
  onImagePress: () => void;
  onClearPress: () => void;
  onNewFloorPress: () => void; // Callback to return to setup screen
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const SEATER_OPTIONS: SeaterType[] = [2, 4, 6, 8, 12];

export default function Sidebar({
  showTableMenu,
  onTablesPress,
  onSelectSeater,
  onImagePress,
  onClearPress,
  onNewFloorPress,
  isSidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  const [customSeats, setCustomSeats] = useState('');
  const [customError, setCustomError] = useState<string | undefined>(undefined);

  const handleCustomSubmit = () => {
    const seats = Number(customSeats);
    if (isNaN(seats) || seats <= 0) {
      setCustomError('Enter seats 1-12');
      return;
    }
    if (seats > 12) {
      setCustomError('Max 12 seats');
      return;
    }
    onSelectSeater(seats);
    setCustomSeats('');
    setCustomError(undefined);
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand logo header — non-clickable, clearly branded */}
      <View style={styles.logoHeader}>
        <View style={styles.logoCircle}>
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke={colors.primary} strokeWidth="2" />
            <Circle cx="12" cy="12" r="6" stroke={colors.primary} strokeWidth="1.2" strokeDasharray="3 2" />
            <Path d="M8 8V11M8 11V15M8 11H9V8M8 11H7V8" stroke={colors.primary} strokeWidth="1.2" strokeLinecap="round" />
            <Path d="M16 8V15M16 8C16 8 17 9 17 11C17 13 16 15 16 15" fill={colors.primary} stroke={colors.primary} strokeWidth="0.8" />
          </Svg>
        </View>
        <Text style={styles.logoTitle}>RTMS</Text>
      </View>

      {/* Tables Button */}
      <View style={styles.relativeWrap}>
        <SidebarButton
          icon={
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <Rect x="4" y="8" width="16" height="10" rx="2" stroke={showTableMenu ? '#FFFFFF' : colors.textOnDark} strokeWidth="2" />
              <Circle cx="12" cy="5" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
              <Circle cx="12" cy="19" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
              <Circle cx="2" cy="13" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
              <Circle cx="22" cy="13" r="1.5" fill={showTableMenu ? '#FFFFFF' : colors.textOnDark} />
            </Svg>
          }
          label="Tables"
          active={showTableMenu}
          onPress={onTablesPress}
        />
        {showTableMenu && (
          <Popover title="Add Table">
            <View style={styles.seaterGrid}>
              {SEATER_OPTIONS.map(seater => (
                <Pressable key={seater} style={styles.seaterOption} onPress={() => onSelectSeater(seater)}>
                  <Text style={styles.seaterOptionText}>{seater}</Text>
                  <Text style={styles.seaterOptionSub}>Seater</Text>
                </Pressable>
              ))}
            </View>

            {/* Separator Line */}
            <View style={styles.popoverDivider} />

            {/* Custom seats row */}
            <View style={styles.customRow}>
              <TextInput
                style={[styles.customInput, customError && styles.customInputError]}
                placeholder="Custom"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={customSeats}
                onChangeText={(txt) => {
                  const sanitized = txt.replace(/[^0-9]/g, '');
                  setCustomSeats(sanitized);
                  setCustomError(undefined);
                }}
              />
              <Pressable style={styles.customAddBtn} onPress={handleCustomSubmit}>
                <Text style={styles.customAddBtnText}>Add</Text>
              </Pressable>
            </View>
            {customError && <Text style={styles.customErrorText}>{customError}</Text>}
          </Popover>
        )}
      </View>

      {/* Image Button */}
      <SidebarButton
        icon={
          <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="18" height="18" rx="3" stroke={colors.textOnDark} strokeWidth="2" />
            <Circle cx="8.5" cy="8.5" r="1.5" fill={colors.textOnDark} />
            <Path d="M21 15L16 10L5 21" stroke={colors.textOnDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        }
        label="Image"
        onPress={onImagePress}
      />

      <View style={styles.sidebarSpacer} />

      {/* New Floor Button */}
      <Pressable style={styles.newFloorBtn} onPress={onNewFloorPress}>
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="18" height="18" rx="2" stroke={colors.primary} strokeWidth="2" />
          <Path d="M12 8V16" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" />
          <Path d="M8 12H16" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" />
        </Svg>
        <Text style={styles.newFloorText}>New</Text>
      </Pressable>

      {/* Clear Button */}
      <Pressable style={styles.clearBtn} onPress={onClearPress}>
        <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <Path d="M3 6H21" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" />
          <Path d="M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6" stroke={colors.danger} strokeWidth="2" />
          <Path d="M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke={colors.danger} strokeWidth="2" />
        </Svg>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>

      {/* Slide Handle (Toggle Button) */}
      <Pressable style={styles.toggleHandle} onPress={onToggleSidebar}>
        <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          {isSidebarOpen ? (
            <Path d="M15 19L8 12L15 5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <Path d="M9 5L16 12L9 19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

function SidebarButton({
  icon,
  label,
  active,
  onPress,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={[styles.sidebarBtn, active && styles.sidebarBtnActive]} onPress={onPress}>
      {icon}
      <Text style={styles.sidebarLabel}>{label}</Text>
      {children}
    </Pressable>
  );
}

function Popover({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.popover}>
      <Text style={styles.popoverTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: colors.sidebarBg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.borderDark,
  },
  logoHeader: {
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: spacing.sm,
    width: '100%',
  },
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(240, 89, 42, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoTitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  sidebarSpacer: { flex: 1 },
  relativeWrap: { position: 'relative', zIndex: 100 },
  sidebarBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  sidebarBtnActive: { backgroundColor: colors.primary },
  sidebarLabel: { fontSize: 9, color: colors.textOnDark, marginTop: 4, fontWeight: '600' },
  clearBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearText: { fontSize: 9, color: colors.danger, marginTop: 4, fontWeight: '600' },
  toggleHandle: {
    position: 'absolute',
    right: -16,
    top: '50%',
    marginTop: -20,
    width: 16,
    height: 40,
    backgroundColor: colors.sidebarBg,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  popover: {
    position: 'absolute',
    left: sizes.sidebarWidth,
    top: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    minWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  popoverTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: spacing.sm },
  seaterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  seaterOption: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  seaterOptionText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  seaterOptionSub: { fontSize: 9, color: colors.textSecondary, fontWeight: '600' },
  popoverDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  customInputError: {
    borderColor: colors.danger,
  },
  customAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customErrorText: {
    color: colors.danger,
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  newFloorBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 89, 42, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240, 89, 42, 0.25)',
    marginBottom: spacing.xs,
  },
  newFloorText: { fontSize: 9, color: colors.primary, marginTop: 4, fontWeight: '600' },
});
