import { createSupabaseClient } from './supabase'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadImageToSupabase(
  file: File | { uri: string; type: string; name: string },
  userId: string,
  bucket: string = 'todo-images'
): Promise<UploadResult> {
  const supabase = createSupabaseClient()

  try {
    let fileData: File | Blob
    let fileName: string

    if ('uri' in file) {
      // Handle React Native file (from camera/photo library)
      const response = await fetch(file.uri)
      fileData = await response.blob()
      fileName = `${userId}/${Date.now()}_${file.name}`
    } else {
      // Handle web file input
      fileData = file
      fileName = `${userId}/${Date.now()}_${file.name}`
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      success: true,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

export async function uploadVoiceNoteToSupabase(
  audioBlob: Blob,
  userId: string,
  bucket: string = 'voice-notes'
): Promise<UploadResult> {
  const supabase = createSupabaseClient()

  try {
    const fileName = `${userId}/${Date.now()}_voice_note.webm`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, audioBlob, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Voice upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return {
      success: true,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Voice upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}