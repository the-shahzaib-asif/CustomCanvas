// App.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';

import Sidebar from './components/Sidebar';
import NewFloorSetup from './components/NewFloorSetup';
import ZoomBar from './components/ZoomBar';
import WorkspaceHeader from './components/WorkspaceHeader';
import FloorCanvas from './components/FloorCanvas';
import { ShapeItem, SeaterType } from './components/CanvasElement';
import { colors, sizes } from './theme';

const MAX_ZOOM = sizes.canvasMaxZoom;
const PPF = sizes.pixelsPerFoot;

export default function App() {
  // ── Floor dimensions ──
  const [floorWidthFt, setFloorWidthFt] = useState<number | null>(null);
  const [floorHeightFt, setFloorHeightFt] = useState<number | null>(null);
  const [floorName, setFloorName] = useState<string>('Ground Floor');

  const CONTENT_W = (floorWidthFt ?? 30) * PPF;
  const CONTENT_H = (floorHeightFt ?? 20) * PPF;

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const viewportWidth = windowWidth; 
  const viewportHeight = windowHeight;

  // Calculate dynamic scale to fit the floor on screen
  const scaleX = viewportWidth / CONTENT_W;
  const scaleY = viewportHeight / CONTENT_H;
  const fitScale = Math.min(scaleX, scaleY) * 0.9; // 10% safety margin
  const dynamicMinZoom = Math.min(0.1, fitScale * 0.8);

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);

  // ── Canvas pan, zoom & rotation shared values ──
  const scale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const canvasRotation = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);
  const savedCanvasRotation = useSharedValue(0);

  // Sidebar slide offset
  const sidebarTranslateX = useSharedValue(0);

  useAnimatedReaction(
    () => Math.round(scale.value * 100),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setZoomPercent)(current);
      }
    },
  );

  // Camera pan clamp with soft overscroll buffer
  const clampPan = (px: number, py: number, s: number) => {
    'worklet';
    const scaledW = CONTENT_W * s;
    const scaledH = CONTENT_H * s;
    const buffer = sizes.panOverscroll;

    const maxPanX = Math.max(0, (scaledW - viewportWidth) / 2) + buffer;
    const maxPanY = Math.max(0, (scaledH - viewportHeight) / 2) + buffer;

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py)),
    };
  };

  const sidebarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarTranslateX.value }],
  }));

  const closeAllPopovers = () => {
    setShowTableMenu(false);
  };

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setIsSidebarOpen(nextState);
    sidebarTranslateX.value = withTiming(nextState ? 0 : -sizes.sidebarWidth, { duration: 250 });
  };

  // ── Gestures ──
  const parentPan = Gesture.Pan()
    .minPointers(2)
    .onChange(e => {
      const next = clampPan(panX.value + e.changeX, panY.value + e.changeY, scale.value);
      panX.value = next.x;
      panY.value = next.y;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  const parentPinch = Gesture.Pinch()
    .onChange(e => {
      const next = Math.min(MAX_ZOOM, Math.max(dynamicMinZoom, scale.value * e.scaleChange));
      scale.value = next;
      const clamped = clampPan(panX.value, panY.value, next);
      panX.value = clamped.x;
      panY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const parentRotate = Gesture.Rotation()
    .onUpdate(e => {
      canvasRotation.value = savedCanvasRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedCanvasRotation.value = canvasRotation.value;
    });

  const bgPan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onChange(e => {
      const next = clampPan(panX.value + e.changeX, panY.value + e.changeY, scale.value);
      panX.value = next.x;
      panY.value = next.y;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  // Combine gestures
  const parentGesture = Gesture.Simultaneous(parentPan, parentPinch, parentRotate, bgPan);

  // ── Zoom Bar Functions ──
  const zoomBy = (factor: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(dynamicMinZoom, scale.value * factor));
    scale.value = withTiming(next, { duration: 150 });
    savedScale.value = next;
    const clamped = clampPan(panX.value, panY.value, next);
    panX.value = withTiming(clamped.x, { duration: 150 });
    panY.value = withTiming(clamped.y, { duration: 150 });
    savedPanX.value = clamped.x;
    savedPanY.value = clamped.y;
  };

  const resetView = () => {
    scale.value = withTiming(1, { duration: 200 });
    panX.value = withTiming(0, { duration: 200 });
    panY.value = withTiming(0, { duration: 200 });
    canvasRotation.value = withTiming(0, { duration: 200 });
    savedScale.value = 1;
    savedPanX.value = 0;
    savedPanY.value = 0;
    savedCanvasRotation.value = 0;
  };

  const fitToScreen = () => {
    const clampedFitScale = Math.max(dynamicMinZoom, Math.min(fitScale, MAX_ZOOM));
    scale.value = withTiming(clampedFitScale, { duration: 250 });
    panX.value = withTiming(0, { duration: 250 });
    panY.value = withTiming(0, { duration: 250 });
    canvasRotation.value = withTiming(0, { duration: 250 });
    savedScale.value = clampedFitScale;
    savedPanX.value = 0;
    savedPanY.value = 0;
    savedCanvasRotation.value = 0;
  };

  useEffect(() => {
    if (floorWidthFt && floorHeightFt) {
      fitToScreen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorWidthFt, floorHeightFt]);

  // ── Element Management ──
  const addTable = (seaterType: SeaterType) => {
    const tableCount = shapes.filter(s => s.type === 'table').length + 1;
    const newTable: ShapeItem = {
      id: Date.now().toString(),
      type: 'table',
      seaterType,
      tableNumber: `T${tableCount}`,
    };
    setShapes(prev => [...prev, newTable]);
    setSelectedId(newTable.id);
    setShowTableMenu(false);
  };

  const deleteShape = (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    setSelectedId(null);
  };

  const clearCanvas = () => {
    setShapes([]);
    setSelectedId(null);
  };

  // Setup flow check
  if (!floorWidthFt || !floorHeightFt) {
    return (
      <NewFloorSetup
        onCreate={(w, h, name) => {
          setFloorWidthFt(w);
          setFloorHeightFt(h);
          setFloorName(name);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Sidebar Drawer Panel */}
      <Animated.View style={[styles.sidebarContainer, sidebarAnimStyle]}>
        <Sidebar
          showTableMenu={showTableMenu}
          onTablesPress={() => setShowTableMenu(prev => !prev)}
          onSelectSeater={addTable}
          onImagePress={() => {}} // Handle photo insertions if needed
          onClearPress={clearCanvas}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
      </Animated.View>

      <View style={styles.canvasArea}>
        {/* Workspace Title Header Info */}
        <WorkspaceHeader
          floorName={floorName}
          widthFt={floorWidthFt}
          heightFt={floorHeightFt}
        />

        {/* Viewport canvas area gestures */}
        <GestureDetector gesture={parentGesture}>
          <View style={StyleSheet.absoluteFill}>
            {/* Click to deselect background target */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                setSelectedId(null);
                closeAllPopovers();
              }}
            />

            {/* Logical floor workspace layout element */}
            <FloorCanvas
              floorWidthFt={floorWidthFt}
              floorHeightFt={floorHeightFt}
              shapes={shapes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={deleteShape}
              scale={scale}
              panX={panX}
              panY={panY}
              canvasRotation={canvasRotation}
              onDeselect={() => {
                setSelectedId(null);
                closeAllPopovers();
              }}
            />
          </View>
        </GestureDetector>

        {/* Floating Zoom Control Bar */}
        <ZoomBar
          zoomPercent={zoomPercent}
          onZoomOut={() => zoomBy(0.85)}
          onZoomIn={() => zoomBy(1 / 0.85)}
          onReset={resetView}
          onFit={fitToScreen}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: sizes.sidebarWidth,
    zIndex: 2000,
  },
  canvasArea: {
    flex: 1,
    backgroundColor: colors.workspaceBg,
    overflow: 'hidden',
  },
});