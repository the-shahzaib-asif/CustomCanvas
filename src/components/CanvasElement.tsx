import React from 'react';
import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { colors, sizes, radius } from '../theme';
import TableWithChairs, { getTableDimensions } from './TablesWithChairs';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'Image' | 'table';
export type SeaterType = number;

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
  canvasScale: SharedValue<number>; // Pass zoom scale to adjust drag speed
  canvasRotation: SharedValue<number>; // Pass canvas rotation to correct drag directions
  ppf: number; // Dynamic pixels per foot based on floor size
}



export default function Shape({
  item,
  selected,
  onSelect,
  onDelete,
  canvasWidth,
  canvasHeight,
  canvasScale,
  canvasRotation,
  ppf,
}: ShapeProps) {
  const { width: itemWidth, height: itemHeight } = getTableDimensions(item.seaterType || 4, item.type, ppf);

  const x = useSharedValue(canvasWidth / 2 - itemWidth / 2);
  const y = useSharedValue(canvasHeight / 2 - itemHeight / 2);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  // Sync rotation from parent state when rotated via top-of-screen toolbar
  React.useEffect(() => {
    if (item.rotation !== undefined) {
      rotation.value = withTiming(item.rotation, { duration: 150 });
      savedRotation.value = item.rotation;
    }
  }, [item.rotation, rotation, savedRotation]);

  // Drag — only when selected, always clamped to the LOGICAL canvas bounds
  const pan = Gesture.Pan()
    .enabled(selected)
    .onChange(e => {
      // Divide finger movement by canvasScale.value so drag speed matches the zoom level
      const dx = e.changeX / canvasScale.value;
      const dy = e.changeY / canvasScale.value;

      // Trigonometric Rotation Matrix: rotate vector by -theta (negative canvas rotation)
      const theta = canvasRotation.value;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      const rotatedDx = dx * cosTheta + dy * sinTheta;
      const rotatedDy = -dx * sinTheta + dy * cosTheta;

      const nextX = x.value + rotatedDx;
      const nextY = y.value + rotatedDy;

      // Define safe clearances in physical feet
      const minGapFt = 0.25;  // 1/4 foot clearance for table edges
      const chairGapFt = 1.25; // 1.25 feet clearance for chairs to sit inside walls

      let leftMargin = minGapFt * ppf;
      let rightMargin = minGapFt * ppf;
      let topMargin = minGapFt * ppf;
      let bottomMargin = minGapFt * ppf;

      if (item.seaterType && item.type === 'table') {
        const seats = item.seaterType;
        if (seats >= 2) {
          topMargin = chairGapFt * ppf;
          bottomMargin = chairGapFt * ppf;
        } else if (seats === 1) {
          topMargin = chairGapFt * ppf;
        }
        if (seats >= 4) {
          leftMargin = chairGapFt * ppf;
          rightMargin = chairGapFt * ppf;
        }
      }

      // Calculate visual bounding box width & height when the table itself is rotated
      const cosR = Math.abs(Math.cos(rotation.value));
      const sinR = Math.abs(Math.sin(rotation.value));
      const itemWidthRot = itemWidth * cosR + itemHeight * sinR;
      const itemHeightRot = itemWidth * sinR + itemHeight * cosR;

      // Map limits back to x.value and y.value (which translate the top-left of the unrotated element)
      const minX = leftMargin - itemWidth / 2 + itemWidthRot / 2;
      const maxX = canvasWidth - rightMargin - itemWidth / 2 - itemWidthRot / 2;
      const minY = topMargin - itemHeight / 2 + itemHeightRot / 2;
      const maxY = canvasHeight - bottomMargin - itemHeight / 2 - itemHeightRot / 2;

      x.value = Math.max(minX, Math.min(nextX, maxX));
      y.value = Math.max(minY, Math.min(nextY, maxY));
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
                ppf={ppf}
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
      </View>
    </GestureDetector>
  );
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

