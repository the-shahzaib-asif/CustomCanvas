import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, spacing, radius, sizes } from '../theme';
import { ShapeItem } from './CanvasElement';

interface WorkspaceHeaderProps {
  floorName: string;
  widthFt: number;
  heightFt: number;
  selectedShape?: ShapeItem;
  onRotate?: () => void;
  onDelete?: () => void;
}

export default function WorkspaceHeader({
  floorName,
  widthFt,
  heightFt,
  selectedShape,
  onRotate,
  onDelete,
}: WorkspaceHeaderProps) {
  const isSelected = !!selectedShape;

  // Shared value for smooth fade transition during layout switch
  const fade = useSharedValue(1);

  React.useEffect(() => {
    // Fade out, switch layout, fade back in
    fade.value = withTiming(0, { duration: 100 }, () => {
      fade.value = withTiming(1, { duration: 150 });
    });
  }, [isSelected, fade]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  // Compute selected shape's friendly name
  const itemLabel = selectedShape
    ? (selectedShape.type === 'table'
        ? `${selectedShape.tableNumber || 'Table'}`
        : `${selectedShape.type}`)
    : '';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.infoCard, animatedStyle]}>
        {isSelected ? (
          <View style={styles.row}>
            <Text style={styles.selectedLabel}>{itemLabel} Selected</Text>
            <View style={styles.divider} />
            
            <Pressable style={styles.actionBtn} onPress={onRotate}>
              <Text style={styles.btnText}>🔄 Rotate</Text>
            </Pressable>
            
            <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
              <Text style={[styles.btnText, styles.deleteBtnText]}>🗑️ Delete</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.workspaceTitle}>{floorName}</Text>
            <Text style={styles.workspaceSubtitle}>
              {widthFt}ft × {heightFt}ft Layout
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.lg,
    left: sizes.sidebarWidth + spacing.lg, // next to the sidebar
    zIndex: 1000,
  },
  infoCard: {
    backgroundColor: 'rgba(26, 29, 41, 0.88)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 46, // keeps layout height stable during transitions
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 2,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteBtnText: {
    color: '#EF4444',
  },
  workspaceTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  workspaceSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
