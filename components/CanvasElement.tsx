import React from 'react';
import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'Image';

export interface ShapeItem {
  id: string;
  type: ShapeType;
  imageUri?: string;
}

export default function Shape({
  item,
  selected,
  onSelect,
  onDelete,
  canvasWidth,
  canvasHeight,
}: {
  item: ShapeItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const x = useSharedValue(100);
  const y = useSharedValue(150);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const saveRotation = useSharedValue(0);

  const SHAPE_SIZE = 64;

  const pan = Gesture.Pan().onChange(e => {
    const nextX = x.value + e.changeX;
    const nextY = y.value + e.changeY;

    x.value = Math.max(0, Math.min(nextX, canvasWidth - SHAPE_SIZE));
    y.value = Math.max(0, Math.min(nextY, canvasHeight - SHAPE_SIZE));
  });

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .onUpdate(e => {
      rotation.value = saveRotation.value + e.rotation;
    })
    .onEnd(() => {
      saveRotation.value = rotation.value;
    });

  const composedGesture = Gesture.Simultaneous(pan, pinch, rotate);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.shapeWrapper, animatedStyle]}>
        <Pressable onPress={onSelect}>
          {item.type === 'Image' ?

            (<Image
              source={{ uri: item.imageUri }}
              style={[styles.imageElement, selected && styles.selectedBorder]}
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

            )

          }
        </Pressable>

        {selected && (
          <View style={styles.selectionContainer} pointerEvents="none">
            <View style={[styles.cornerDot, styles.topLeftDot]} />
            <View style={[styles.cornerDot, styles.topRightDot]} />
            <View style={[styles.cornerDot, styles.bottomLeftDot]} />
            <View style={[styles.cornerDot, styles.bottomRightDot]} />
            <View style={styles.rotationConnector} />
            <View style={styles.rotationHandle}>
              <Text style={styles.rotationText}>↻</Text>
            </View>
          </View>
        )}
        {selected && (
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteText}>✕</Text>
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  shapeWrapper: {
    position: 'absolute',
    padding: 40,
  },
  square: {
    width: 64,
    height: 64,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 32,
    borderRightWidth: 32,
    borderBottomWidth: 64,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f59e0b',
  },
  diamond: {
    width: 64,
    height: 64,
    backgroundColor: '#ec4899',
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  selectionContainer: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 64,
    height: 64,
  },
  imageElement: {
    width: 64,
    height: 64,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  cornerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  topLeftDot: {
    top: -5,
    left: -5,
  },
  topRightDot: {
    top: -5,
    right: -5,
  },
  bottomLeftDot: {
    bottom: -5,
    left: -5,
  },
  bottomRightDot: {
    bottom: -5,
    right: -5,
  },
  rotationConnector: {
    position: 'absolute',
    top: -16,
    left: '50%',
    width: 1.5,
    height: 16,
    backgroundColor: '#6366f1',
  },
  rotationHandle: {
    position: 'absolute',
    top: -32,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    borderWidth: 1,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  rotationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  deleteBtn: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: '#0f172a',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
