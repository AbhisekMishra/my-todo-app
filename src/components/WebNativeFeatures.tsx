'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, Camera, Image as ImageIcon, MicOff } from 'lucide-react'

interface WebNativeFeaturesProps {
  onVoiceInput: (text: string) => void
  onImageSelected: (imageUrl: string) => void
  onError?: (message: string) => void
}

export function WebNativeFeatures({ onVoiceInput, onImageSelected, onError }: WebNativeFeaturesProps) {
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Initialize Speech Recognition
  const initSpeechRecognition = useCallback(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognition = new SpeechRecognitionAPI()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        setIsRecording(true)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        onVoiceInput(transcript)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsListening(false)
        setIsRecording(false)
      }

      return recognition
    }
    return null
  }, [onVoiceInput])

  // Start/Stop Voice Recording
  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition()
    }

    if (!recognitionRef.current) {
      onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  // Handle camera capture
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  // Handle gallery selection
  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Handle file selection (both camera and gallery)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Create a URL for the image
      const imageUrl = URL.createObjectURL(file)
      onImageSelected(imageUrl)

      // Reset the input
      event.target.value = ''
    }
  }

  // Check if features are supported
  const isSpeechSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
      {/* Voice Recording Button */}
      <button
        onClick={toggleVoiceRecording}
        disabled={!isSpeechSupported}
        className={`flex items-center justify-center sm:justify-start space-x-2 px-4 py-2 rounded-lg ${
          isRecording ? 'animate-pulse' : ''
        } ${!isSpeechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          backgroundColor: isRecording ? 'var(--destructive)' : 'var(--success)',
          color: 'white',
          fontFamily: 'Google Sans, sans-serif'
        }}
        title={!isSpeechSupported ? 'Speech recognition not supported in this browser' : ''}
        aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
      >
        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        <span className="text-sm sm:text-base">{isRecording ? 'Stop Recording' : 'Voice Input'}</span>
      </button>

      {/* Camera Capture Button */}
      <button
        onClick={handleCameraCapture}
        className="flex items-center justify-center sm:justify-start space-x-2 px-4 py-2 rounded-lg"
        style={{
          backgroundColor: 'var(--info)',
          color: 'white',
          fontFamily: 'Google Sans, sans-serif'
        }}
        aria-label="Take photo"
      >
        <Camera className="h-4 w-4" />
        <span className="text-sm sm:text-base">Take Photo</span>
      </button>

      {/* Gallery Button */}
      <button
        onClick={handleGallerySelect}
        className="flex items-center justify-center sm:justify-start space-x-2 px-4 py-2 rounded-lg"
        style={{
          backgroundColor: 'var(--warning)',
          color: 'white',
          fontFamily: 'Google Sans, sans-serif'
        }}
        aria-label="Select from gallery"
      >
        <ImageIcon className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm sm:text-base">Gallery</span>
      </button>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-label="Camera input"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Status indicators */}
      {isRecording && (
        <div className="flex items-center space-x-2" style={{ color: 'var(--destructive)' }}>
          <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--destructive)' }}></div>
          <span className="text-sm" style={{ fontFamily: 'Google Sans, sans-serif' }}>Listening...</span>
        </div>
      )}
    </div>
  )
}