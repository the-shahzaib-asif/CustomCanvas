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

export const getTableDimensions = (seater: SeaterType, type: ShapeType) => {
  if (type !== 'table') {
    return { width: sizes.shapeBase, height: sizes.shapeBase };
  }
  switch (seater) {
    case 2:
      return { width: 56, height: 56 };
    case 6:
      return { width: 96, height: 64 };
    case 8:
      return { width: 120, height: 64 };
    case 12:
      return { width: 170, height: 64 };
    case 4:
    default:
      return { width: 64, height: 64 };
  }
};

export default function Shape({
  item,
  selected,
  onSelect,
  onDelete,
  canvasWidth,
  canvasHeight,
}: ShapeProps) {
  const { width: itemWidth, height: itemHeight } = getTableDimensions(item.seaterType || 4, item.type);

  const x = useSharedValue(canvasWidth / 2 - itemWidth / 2);
  const y = useSharedValue(canvasHeight / 2 - itemHeight / 2);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(selected)
    .onChange(e => {
      const nextX = x.value + e.changeX;
      const nextY = y.value + e.changeY;
      const margin = 28;
      x.value = Math.max(margin, Math.min(nextX, canvasWidth - itemWidth - margin));
      y.value = Math.max(margin, Math.min(nextY, canvasHeight - itemHeight - margin));
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

  const composedGesture = selected ? Gesture.Simultaneous(pan, rotate) : tapToSelect;

  const handleRotateButton = () => {
    const next = rotation.value + Math.PI / 4;
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

  const toolbarStyle = useAnimatedStyle(() => {
    const rawY = y.value - 48;
    const clampedY = Math.max(rawY, 4);

    return {
      transform: [
        { translateX: x.value + itemWidth / 2 - 40 },
        { translateY: clampedY },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

        <Animated.View style={[styles.wrapper, wrapperStyle, { width: itemWidth, height: itemHeight }]}>
          {selected && (
            <View
              style={[styles.selectionOutline, { width: itemWidth + 16, height: itemHeight + 16 }]}
              pointerEvents="none"
            />
          )}

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
                width={itemWidth}
                height={itemHeight}
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

        {selected && (
          <Animated.View style={[styles.toolbarAbsolute, toolbarStyle]} pointerEvents="box-none">
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

function TableWithChairs({
  seaterType,
  tableNumber,
  selected,
  width,
  height,
}: {
  seaterType: SeaterType;
  tableNumber?: string;
  selected: boolean;
  width: number;
  height: number;
}) {
  const chairPositions = getChairLayout(seaterType, width, height);

  return (
    <View style={[tableStyles.wrapper, { width, height }]}>
      {chairPositions.map((pos, i) => (
        <View key={i} style={[tableStyles.chair, pos]} />
      ))}
      <View style={[tableStyles.tableBody, { width, height }, selected && styles.selectedBorder]}>
        <Text style={tableStyles.tableLabel}>{tableNumber || `T${seaterType}`}</Text>
      </View>
    </View>
  );
}

function getChairLayout(seaterType: SeaterType, width: number, height: number) {
  const positions: any[] = [];

  if (seaterType === 2) {
    // 2-Seater: 1 chair on top, 1 on bottom
    positions.push(
      { top: -14, left: width / 2 - 7 },
      { bottom: -14, left: width / 2 - 7 }
    );
  } else if (seaterType === 4) {
    // 4-Seater: 1 chair on each of the 4 sides
    positions.push(
      { top: -14, left: width / 2 - 7 },
      { bottom: -14, left: width / 2 - 7 },
      { left: -14, top: height / 2 - 7 },
      { right: -14, top: height / 2 - 7 }
    );
  } else {
    // Rectangular tables (6, 8, 12 seaters):
    // Spaced out evenly along the sides, and 1 chair on each end (left and right)
    const sideChairs = (seaterType - 2) / 2;
    const gap = width / (sideChairs + 1);

    for (let i = 1; i <= sideChairs; i++) {
      positions.push({ top: -14, left: gap * i - 7 });
      positions.push({ bottom: -14, left: gap * i - 7 });
    }

    positions.push(
      { left: -14, top: height / 2 - 7 },
      { right: -14, top: height / 2 - 7 }
    );
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

