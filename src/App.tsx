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
import { launchImageLibrary } from 'react-native-image-picker';
import { ShapeItem, SeaterType } from './components/CanvasElement';
import { colors, sizes } from './theme';

const MAX_ZOOM = sizes.canvasMaxZoom;

export default function App() {
  // ── Floor dimensions ──
  const [floorWidthFt, setFloorWidthFt] = useState<number | null>(null);
  const [floorHeightFt, setFloorHeightFt] = useState<number | null>(null);
  const [floorName, setFloorName] = useState<string>('Ground Floor');

  // Compute dynamic PPF so that the maximum floor dimension never exceeds 1000px
  const maxDimFt = Math.max(floorWidthFt ?? 30, floorHeightFt ?? 20);
  const PPF = Math.min(40, 1000 / maxDimFt);

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
  const [isRotationLocked, setIsRotationLocked] = useState(false); // New lock rotation state

  // ── Canvas pan, zoom & rotation shared values ──
  const scale = useSharedValue(1);
  const fitScaleShared = useSharedValue(1); // Calibration base value

  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const canvasRotation = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);
  const savedCanvasRotation = useSharedValue(0);

  // Keep fitScaleShared synced with fitScale state calculation
  useEffect(() => {
    fitScaleShared.value = fitScale;
  }, [fitScale]);

  // Sidebar slide offset
  const sidebarTranslateX = useSharedValue(0);

  // Convert absolute Reanimated scale to dynamic user-friendly percentage relative to fitScale
  useAnimatedReaction(
    () => Math.round((scale.value / fitScaleShared.value) * 100),
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

  // Zoom limits relative to fitScale (50% min, 200% max)
  const parentPinch = Gesture.Pinch()
    .onChange(e => {
      const next = scale.value * e.scaleChange;
      const minZoom = fitScaleShared.value * 0.5; // 50%
      const maxZoom = fitScaleShared.value * 2.0; // 200%
      scale.value = Math.min(maxZoom, Math.max(minZoom, next));
      const clamped = clampPan(panX.value, panY.value, scale.value);
      panX.value = clamped.x;
      panY.value = clamped.y;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Disable rotation gesture when locked
  const parentRotate = Gesture.Rotation()
    .enabled(!isRotationLocked)
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
    const next = scale.value * factor;
    const minZoom = fitScaleShared.value * 0.5; // 50%
    const maxZoom = fitScaleShared.value * 2.0; // 200%
    const clampedScale = Math.min(maxZoom, Math.max(minZoom, next));
    scale.value = withTiming(clampedScale, { duration: 150 });
    savedScale.value = clampedScale;
    const clamped = clampPan(panX.value, panY.value, clampedScale);
    panX.value = withTiming(clamped.x, { duration: 150 });
    panY.value = withTiming(clamped.y, { duration: 150 });
    savedPanX.value = clamped.x;
    savedPanY.value = clamped.y;
  };

  const resetView = () => {
    scale.value = withTiming(fitScale, { duration: 200 }); // reset to 100% zoom (fitScale)
    panX.value = withTiming(0, { duration: 200 });
    panY.value = withTiming(0, { duration: 200 });
    canvasRotation.value = withTiming(0, { duration: 200 });
    savedScale.value = fitScale;
    savedPanX.value = 0;
    savedPanY.value = 0;
    savedCanvasRotation.value = 0;
  };

  const fitToScreen = () => {
    scale.value = withTiming(fitScale, { duration: 250 });
    panX.value = withTiming(0, { duration: 250 });
    panY.value = withTiming(0, { duration: 250 });
    canvasRotation.value = withTiming(0, { duration: 250 });
    savedScale.value = fitScale;
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

  const addImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 1 }, response => {
      if (response.didCancel || response.errorMessage) {
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        const newImage: ShapeItem = {
          id: Date.now().toString(),
          type: 'Image',
          imageUri: uri,
        };
        setShapes(prev => [...prev, newImage]);
        setSelectedId(newImage.id); // Select the placed image immediately
      }
    });
  };

  const deleteShape = (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    setSelectedId(null);
  };

  const rotateShape = (id: string) => {
    setShapes(prev => prev.map(s => {
      if (s.id === id) {
        const currentRot = s.rotation || 0;
        return { ...s, rotation: currentRot + Math.PI / 2 }; // Rotate by 90 degrees
      }
      return s;
    }));
  };

  const clearCanvas = () => {
    setShapes([]);
    setSelectedId(null);
  };

  const resetFloor = () => {
    setFloorWidthFt(null);
    setFloorHeightFt(null);
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

  const selectedShape = shapes.find(s => s.id === selectedId);

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Sidebar Drawer Panel */}
      <Animated.View style={[styles.sidebarContainer, sidebarAnimStyle]}>
        <Sidebar
          showTableMenu={showTableMenu}
          onTablesPress={() => setShowTableMenu(prev => !prev)}
          onSelectSeater={addTable}
          onImagePress={addImage}
          onClearPress={clearCanvas}
          onNewFloorPress={resetFloor}
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
          selectedShape={selectedShape}
          onRotate={() => selectedId && rotateShape(selectedId)}
          onDelete={() => selectedId && deleteShape(selectedId)}
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
              ppf={PPF}
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
          isRotationLocked={isRotationLocked}
          onToggleRotationLock={() => setIsRotationLocked(prev => !prev)}
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