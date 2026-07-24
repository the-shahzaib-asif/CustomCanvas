# CustomCanva

CustomCanva is a React Native drawing canvas application built for smooth, high-performance animations and drawing interactions. 

This project explores handling gestures, standard layouts, and freehand drawing using industry-standard libraries.

---

## 🚀 Key Libraries Used

* **[React Native Gesture Handler](https://software-mansion.github.io/react-native-gesture-handler/)**: Handles high-performance multi-touch gestures (dragging, shape manipulation).
* **[React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)**: Powers butter-smooth layout animations at 60fps/120fps by offloading animation code to the UI thread.
* **[Shopify React Native Skia](https://shopify.github.io/react-native-skia/)**: Used for efficient freehand pencil drawing and path rendering.

---

## 🛠️ Features

* **Interactive Shapes**: Add and drag shapes (Squares, Circles, Triangles, Diamonds) on the canvas.
* **Interactive Controls**: Select shapes to display borders and delete buttons.
* **Pencil Tool (In Progress)**: Freehand sketching capability.
* **Canvas Clear**: Instantly reset the canvas.

---

## 🏃 Getting Started

### Step 1: Start the Metro Server
```sh
npm start -- --reset-cache
```

### Step 2: Run the App
* **Android**:
  ```sh
  npm run android
  ```
* **iOS**:
  ```sh
  npm run ios
  ```
