import React from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface ZoomBarProps {
  zoomPercent: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFit: () => void;
}

export default function ZoomBar({
  zoomPercent,
  onZoomOut,
  onZoomIn,
  onReset,
  onFit,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnText: { color: colors.textOnDark, fontSize: 18, fontWeight: '600', marginTop: -2 },
  zoomBtnTextSmall: { color: colors.textOnDark, fontSize: 14, fontWeight: '600' },
  zoomLabelWrap: { paddingHorizontal: spacing.md },
  zoomLabelText: { color: colors.textOnDark, fontSize: 13, fontWeight: '700' },
  zoomDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.xs,
  },
});
