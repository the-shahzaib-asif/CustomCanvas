// components/CanvasElement.tsx
import React from 'react';
import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { colors, sizes, radius } from '../theme';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'Image' | 'table';
export type SeaterType = 2 | 4 | 6 | 8 | 12;

export interface ShapeItem {
  id: string;
  type: ShapeType;
  imageUri?: string;
  seaterType?: SeaterType;
  tableNumber?: string;
}

interface ShapeProps {
  item: ShapeItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export default function Shape({
  item,
  selected,
  onSelect,
  onDelete,
  canvasWidth,
  canvasHeight,
}: ShapeProps) {
  const x = useSharedValue(canvasWidth / 2 - sizes.shapeBase / 2);
  const y = useSharedValue(canvasHeight / 2 - sizes.shapeBase / 2);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(selected)
    .onChange(e => {
      const nextX = x.value + e.changeX;
      const nextY = y.value + e.changeY;
      const margin = 28;
      x.value = Math.max(margin, Math.min(nextX, canvasWidth - sizes.shapeBase - margin));
      y.value = Math.max(margin, Math.min(nextY, canvasHeight - sizes.shapeBase - margin));
    });

  const pinch = Gesture.Pinch()
    .enabled(selected)
    .onUpdate(e => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(sizes.minScale, Math.min(next, sizes.maxScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .enabled(selected)
    .onUpdate(e => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const tapToSelect = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      onSelect();
    });

  const composedGesture = selected ? Gesture.Simultaneous(pan, pinch, rotate) : tapToSelect;


  const handleUpScale = () => {
    const next = Math.min(scale.value + 0.15, sizes.maxScale);
    scale.value = withTiming(next, { duration: 150 });
    savedScale.value = next;
  };

  const handleDownScale = () => {
    const next = Math.max(scale.value - 0.15, sizes.minScale);
    scale.value = withTiming(next, { duration: 150 });
    savedScale.value = next;
  };


  const handleRotateButton = () => {
    const next = rotation.value + Math.PI / 4; // Rotate 45 degrees
    rotation.value = withTiming(next, { duration: 150 });
    savedRotation.value = next;
  };


  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Dynamic toolbar style to flip position if shape is near the top boundary
  // positioned absolutely relative to the parent canvas (never scales or rotates)
  const toolbarStyle = useAnimatedStyle(() => {
    const showBelow = y.value < 60;
    const targetY = showBelow ? y.value + sizes.shapeBase + 12 : y.value - 48;
    return {
      transform: [
        { translateX: x.value + (sizes.shapeBase / 2) - 68 }, // Center it horizontally (toolbar width is ~136px)
        { translateY: withSpring(targetY, { damping: 15 }) },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        
        {/* Translated, Scaled, and Rotated Shape content */}
        <Animated.View style={[styles.wrapper, wrapperStyle]}>
          {/* Selection dashed outline around the shape */}
          {selected && <View style={styles.selectionOutline} pointerEvents="none" />}

          <Animated.View style={contentStyle}>
            <Pressable onPress={onSelect}>
              {item.type === 'Image' ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={[styles.imageElement, selected && styles.selectedBorder]}
                />
              ) : item.type === 'table' ? (
                <TableWithChairs
                  seaterType={item.seaterType || 4}
                  tableNumber={item.tableNumber}
                  selected={selected}
                />
              ) : (
                <View
                  style={[
                    item.type === 'square' && styles.square,
                    item.type === 'circle' && styles.circle,
                    item.type === 'triangle' && styles.triangle,
                    item.type === 'diamond' && styles.diamond,
                    selected && styles.selectedBorder,
                  ]}
                />
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Flat, Upright Action Toolbar (sits outside the rotation View) */}
        {selected && (
          <Animated.View style={[styles.toolbarAbsolute, toolbarStyle]} pointerEvents="box-none">
            <Pressable style={styles.toolbarBtn} onPress={handleUpScale}>
              <Text style={styles.toolbarBtnText}>➕</Text>
            </Pressable>
            <Pressable style={styles.toolbarBtn} onPress={handleDownScale}>
              <Text style={styles.toolbarBtnText}>➖</Text>
            </Pressable>
            <Pressable style={styles.toolbarBtn} onPress={handleRotateButton}>
              <Text style={styles.toolbarBtnText}>🔄</Text>
            </Pressable>
            <Pressable style={[styles.toolbarBtn, styles.deleteBtnSpec]} onPress={onDelete}>
              <Text style={styles.deleteBtnTextSpec}>🗑️</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

// ---------- Table + Chairs ----------

function TableWithChairs({
  seaterType,
  tableNumber,
  selected,
}: {
  seaterType: SeaterType;
  tableNumber?: string;
  selected: boolean;
}) {
  const chairPositions = getChairLayout(seaterType);

  return (
    <View style={tableStyles.wrapper}>
      {chairPositions.map((pos, i) => (
        <View key={i} style={[tableStyles.chair, pos]} />
      ))}
      <View style={[tableStyles.tableBody, selected && styles.selectedBorder]}>
        <Text style={tableStyles.tableLabel}>{tableNumber || `T${seaterType}`}</Text>
      </View>
    </View>
  );
}

function getChairLayout(seaterType: SeaterType) {
  const positions: any[] = [];

  if (seaterType === 2) {
    positions.push({ top: -14, left: 25 }, { bottom: -14, left: 25 });
  } else if (seaterType === 4) {
    positions.push(
      { top: -14, left: 25 },
      { bottom: -14, left: 25 },
      { left: -14, top: 25 },
      { right: -14, top: 25 },
    );
  } else if (seaterType === 6) {
    positions.push(
      { top: -14, left: 10 }, { top: -14, right: 10 },
      { bottom: -14, left: 10 }, { bottom: -14, right: 10 },
      { left: -14, top: 25 }, { right: -14, top: 25 },
    );
  } else {
    const perSide = Math.ceil((seaterType - 2) / 2 / 2);
    const gap = 64 / (perSide + 1);
    for (let i = 1; i <= perSide; i++) {
      positions.push({ top: -14, left: gap * i - 7 });
      positions.push({ bottom: -14, left: gap * i - 7 });
    }
    positions.push({ left: -14, top: 25 }, { right: -14, top: 25 });
  }

  return positions;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    // Make sure we have enough space around the shape so children (toolbar) don't get clipped easily
    justifyContent: 'center',
    alignItems: 'center',
  },
  square: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  circle: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    borderRadius: sizes.shapeBase / 2,
    backgroundColor: colors.success,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 32,
    borderRightWidth: 32,
    borderBottomWidth: 64,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primaryDark,
  },
  diamond: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    backgroundColor: colors.primary,
    transform: [{ rotate: '45deg' }],
  },
  imageElement: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    borderRadius: radius.sm,
    resizeMode: 'cover',
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: colors.primary,
  },

  // Selection box visual outline (dashed border around the shape)
  selectionOutline: {
    position: 'absolute',
    width: sizes.shapeBase + 16,
    height: sizes.shapeBase + 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.sm,
  },

  toolbarAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    backgroundColor: colors.sidebarBg,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
    gap: 4,
    alignItems: 'center',
    zIndex: 1000,
  },
  toolbarBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarBtnText: {
    fontSize: 12,
  },
  deleteBtnSpec: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteBtnTextSpec: {
    fontSize: 12,
  },
});

const tableStyles = StyleSheet.create({
  wrapper: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableBody: {
    width: sizes.shapeBase,
    height: sizes.shapeBase,
    backgroundColor: colors.tableFill,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableLabel: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 11,
  },
  chair: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: colors.chairFill,
    borderRadius: 3,
  },
});

