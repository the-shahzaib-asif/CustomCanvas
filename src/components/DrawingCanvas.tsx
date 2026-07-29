// components/DrawingCanvas.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';

export interface DrawingPath {
  path: SkPath;
  color: string;
  strokeWidth: number;
  isEraser: boolean;
}

interface DrawingCanvasProps {
  paths: DrawingPath[];
  setPaths: React.Dispatch<React.SetStateAction<DrawingPath[]>>;
  currentPath: DrawingPath | null;
  setCurrentPath: React.Dispatch<React.SetStateAction<DrawingPath | null>>;
  tool: 'shapes' | 'pencil' | 'eraser';
  pencilColor: string;
}

export default function DrawingCanvas({
  paths,
  setPaths,
  currentPath,
  setCurrentPath,
  tool,
  pencilColor,
}: DrawingCanvasProps) {
  const pencilPan = Gesture.Pan()
    .runOnJS(true)
    .onStart(e => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      setCurrentPath({ path, color: pencilColor, strokeWidth: 4, isEraser: false });
    })
    .onUpdate(e => {
      if (currentPath) {
        currentPath.path.lineTo(e.x, e.y);
        setCurrentPath({ ...currentPath, path: currentPath.path.copy() });
      }
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath(null);
      }
    });

  const eraserPan = Gesture.Pan()
    .runOnJS(true)
    .onStart(e => {
      const path = Skia.Path.Make();
      path.moveTo(e.x, e.y);
      setCurrentPath({ path, color: '#000000', strokeWidth: 24, isEraser: true });
    })
    .onUpdate(e => {
      if (currentPath) {
        currentPath.path.lineTo(e.x, e.y);
        setCurrentPath({ ...currentPath, path: currentPath.path.copy() });
      }
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths(prev => [...prev, currentPath]);
        setCurrentPath(null);
      }
    });

  const isDrawingMode = tool === 'pencil' || tool === 'eraser';

  const renderPaths = () => (
    <>
      {paths.map((p, idx) => (
        <Path
          key={idx}
          path={p.path}
          color={p.color}
          strokeWidth={p.strokeWidth}
          style="stroke"
          strokeCap="round"
          strokeJoin="round"
          blendMode={p.isEraser ? 'clear' : 'srcOver'}
        />
      ))}
      {currentPath && (
        <Path
          path={currentPath.path}
          color={currentPath.color}
          strokeWidth={currentPath.strokeWidth}
          style="stroke"
          strokeCap="round"
          strokeJoin="round"
          blendMode={currentPath.isEraser ? 'clear' : 'srcOver'}
        />
      )}
    </>
  );

  if (!isDrawingMode) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>{renderPaths()}</Canvas>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <GestureDetector gesture={tool === 'pencil' ? pencilPan : eraserPan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>{renderPaths()}</Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}