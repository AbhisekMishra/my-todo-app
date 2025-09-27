interface NativeCapabilities {
  startVoiceRecording: () => void
  stopVoiceRecording: () => void
  openCamera: () => void
  openPhotoLibrary: () => void
  isNative: boolean
}

declare global {
  interface Window {
    nativeCapabilities?: NativeCapabilities
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

export {}