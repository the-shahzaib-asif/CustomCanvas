// components/CanvasElement.tsx
import React from 'react';
import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  canvasWidth: number;   // logical/content width — NOT screen width
  canvasHeight: number;  // logical/content height — NOT screen height
}

export const getTableDimensions = (seater: SeaterType, type: ShapeType) => {
  if (type !== 'table') {
    return { width: sizes.shapeBase, height: sizes.shapeBase };
  }
  switch (seater) {
    case 2:
      return { width: 70, height: 70 };
    case 6:
      return { width: 120, height: 70 };
    case 8:
      return { width: 150, height: 70 };
    case 12:
      return { width: 200, height: 70 };
    case 4:
    default:
      return { width: 80, height: 80 };
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

  // Drag — only when selected, always clamped to the LOGICAL canvas bounds
  // (this space never changes even if the whole canvas is zoomed/panned)
  const pan = Gesture.Pan()
    .enabled(selected)
    .onChange(e => {
      const nextX = x.value + e.changeX;
      const nextY = y.value + e.changeY;
      const margin = 4;
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

  // Toolbar: always stays ABOVE the table, no flip, no spring delay.
  // Clamped so it never renders above the visible canvas top edge.
  const toolbarStyle = useAnimatedStyle(() => {
    const rawY = y.value - 44;
    const clampedY = Math.max(rawY, 4);
    const rawX = x.value + itemWidth / 2 - 40;
    const clampedX = Math.max(4, Math.min(rawX, canvasWidth - 80 - 4));

    return {
      transform: [
        { translateX: clampedX },
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
  const isRound = seaterType === 2;

  return (
    <View style={[tableStyles.wrapper, { width: width + 36, height: height + 36 }]}>
      {chairPositions.map((pos, i) => (
        <View key={i} style={[tableStyles.chair, pos]} />
      ))}

      <View
        style={[
          tableStyles.tableBody,
          {
            width,
            height,
            borderRadius: isRound ? width / 2 : radius.md,
          },
          selected && tableStyles.tableSelected,
        ]}
      >
        <Text style={tableStyles.tableLabel}>{tableNumber || `T${seaterType}`}</Text>
        <Text style={tableStyles.tableSeatCount}>{seaterType} seats</Text>
      </View>
    </View>
  );
}

function getChairLayout(seaterType: SeaterType, width: number, height: number) {
  const positions: any[] = [];
  const chairSize = 16;
  const offsetX = 18;
  const offsetY = 18;

  if (seaterType === 2) {
    positions.push(
      { top: -2, left: width / 2 - chairSize / 2 + offsetX },
      { bottom: -2, left: width / 2 - chairSize / 2 + offsetX },
    );
  } else if (seaterType === 4) {
    positions.push(
      { top: -2, left: width / 2 - chairSize / 2 + offsetX },
      { bottom: -2, left: width / 2 - chairSize / 2 + offsetX },
      { left: -2, top: height / 2 - chairSize / 2 + offsetY },
      { right: -2, top: height / 2 - chairSize / 2 + offsetY },
    );
  } else {
    const sideChairs = (seaterType - 2) / 2;
    const gap = width / (sideChairs + 1);

    for (let i = 1; i <= sideChairs; i++) {
      positions.push({ top: -2, left: gap * i - chairSize / 2 + offsetX });
      positions.push({ bottom: -2, left: gap * i - chairSize / 2 + offsetX });
    }

    positions.push(
      { left: -2, top: height / 2 - chairSize / 2 + offsetY },
      { right: -2, top: height / 2 - chairSize / 2 + offsetY },
    );
  }

  return positions;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
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
  selectionOutline: {
    position: 'absolute',
    top: -8,
    left: -8,
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
  toolbarBtnText: { fontSize: 12 },
  deleteBtnSpec: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  deleteBtnTextSpec: { fontSize: 12 },
});

const tableStyles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableBody: {
    backgroundColor: colors.tableFill,
    borderWidth: 1.5,
    borderColor: colors.tableBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tableSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tableLabel: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tableSeatCount: {
    color: '#94A3B8',
    fontSize: 9,
    marginTop: 1,
    fontWeight: '600',
  },
  chair: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: colors.chairFill,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.chairBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});