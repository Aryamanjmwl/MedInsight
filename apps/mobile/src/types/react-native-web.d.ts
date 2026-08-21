import 'react-native';

declare module 'react-native' {
  /**
   * React Native Web supplies `hovered` to Pressable style callbacks at runtime,
   * while the core React Native declaration only exposes `pressed`. Keep the
   * cross-platform source typed without changing the native Pressable contract.
   */
  interface PressableStateCallbackType {
    readonly hovered?: boolean;
  }
}
