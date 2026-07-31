import React from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface ZoomBarProps {
  zoomPercent: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFit: () => void;
  isRotationLocked: boolean;
  onToggleRotationLock: () => void;
}

export default function ZoomBar({
  zoomPercent,
  onZoomOut,
  onZoomIn,
  onReset,
  onFit,
  isRotationLocked,
  onToggleRotationLock,
}: ZoomBarProps) {
  return (
    <View style={styles.zoomBar}>
      <Pressable style={styles.zoomBtn} onPress={onZoomOut}>
        <Text style={styles.zoomBtnText}>−</Text>
      </Pressable>
      <Pressable onPress={onReset} style={styles.zoomLabelWrap}>
        <Text style={styles.zoomLabelText}>{zoomPercent}%</Text>
      </Pressable>
      <Pressable style={styles.zoomBtn} onPress={onZoomIn}>
        <Text style={styles.zoomBtnText}>+</Text>
      </Pressable>
      <View style={styles.zoomDivider} />
      <Pressable style={styles.zoomBtn} onPress={onFit}>
        <Text style={styles.zoomBtnTextSmall}>⛶</Text>
      </Pressable>
      <View style={styles.zoomDivider} />
      <Pressable 
        style={[styles.zoomBtn, isRotationLocked && styles.activeLockBtn]} 
        onPress={onToggleRotationLock}
      >
        <Text style={styles.zoomBtnTextSmall}>{isRotationLocked ? '🔒' : '🔓'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  zoomBar: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.sidebarBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeLockBtn: {
    backgroundColor: 'rgba(240, 89, 42, 0.25)', // Bookme orange tint background when locked
  },
  zoomBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  zoomBtnTextSmall: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  zoomLabelWrap: {
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  zoomLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  zoomDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 2,
  },
});
