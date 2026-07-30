import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, radius, sizes } from '../theme';

interface WorkspaceHeaderProps {
  floorName: string;
  widthFt: number;
  heightFt: number;
}

export default function WorkspaceHeader({
  floorName,
  widthFt,
  heightFt,
}: WorkspaceHeaderProps) {
  return (
    <View style={styles.workspaceHeader} pointerEvents="none">
      <Text style={styles.workspaceTitle}>{floorName}</Text>
      <Text style={styles.workspaceSubtitle}>
        {widthFt}ft × {heightFt}ft Layout
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  workspaceHeader: {
    position: 'absolute',
    top: spacing.lg,
    left: sizes.sidebarWidth + spacing.lg, // place next to the sidebar
    zIndex: 1000,
    backgroundColor: 'rgba(26, 29, 41, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
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
