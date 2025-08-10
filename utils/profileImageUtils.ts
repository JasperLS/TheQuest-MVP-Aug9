import { supabase } from '@/lib/supabase';

/**
 * Uploads a profile image to Supabase storage
 * @param userId - The user's ID
 * @param imageUri - The local image URI
 * @param imageBase64 - Optional base64 data for web compatibility
 * @returns Object with success status and image URL or error
 */
export async function uploadProfileImage(
  userId: string, 
  imageUri: string, 
  imageBase64?: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const timestamp = Date.now();
    const fileExtension = imageUri.split('.').pop() || 'jpg';
    // Create path structure: profile/{userId}
    // This should work with RLS policy: split_part(name, '/', 2) = auth.uid()
    // The name will be 'profile/{userId}' and split_part(name, '/', 2) will be '{userId}'
    const filePath = `profile/${userId}`;

    let base64Data: string;
    
    // Use base64 data directly - this is more reliable in React Native
    if (imageBase64) {
      base64Data = imageBase64;
      console.log('Using provided base64, length:', imageBase64.length);
    } else {
      // Fallback: try to convert URI to base64 if no base64 provided
      try {
        base64Data = await imageUriToBase64(imageUri);
        console.log('Converted URI to base64, length:', base64Data.length);
      } catch (error) {
        console.error('Error converting image to base64:', error);
        return { success: false, error: 'Failed to process image data' };
      }
    }

    // Ensure we have valid base64 data
    if (!base64Data || base64Data.length < 100) {
      return { success: false, error: 'Invalid or empty image data' };
    }

    // Convert base64 string back to binary data for proper upload
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    console.log('Converted to binary data, size:', binaryData.length, 'bytes');

    console.log('Uploading to path:', filePath, 'with binary data size:', binaryData.length);

    const { data, error } = await supabase.storage
      .from('profiles')
      .upload(filePath, binaryData, {
        cacheControl: '3600',
        upsert: true,
        contentType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
      });

    if (error) {
      console.error('Error uploading profile image:', error);
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      return { success: false, error: 'Failed to get public URL' };
    }

    console.log('Upload successful, URL:', urlData.publicUrl);
    return { success: true, imageUrl: urlData.publicUrl };
  } catch (error) {
    console.error('Error in uploadProfileImage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Deletes a profile image from Supabase storage
 * @param imageUrl - The full URL of the image to delete
 * @returns Object with success status and error if any
 */
export async function deleteProfileImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract the file path from the URL
    // URL format: https://.../storage/v1/object/public/profiles/profile/{userId}
    // Path structure: profile/{userId}
    const urlParts = imageUrl.split('/');
    const profilesIndex = urlParts.findIndex(part => part === 'profiles');
    
    if (profilesIndex === -1 || profilesIndex + 2 >= urlParts.length) {
      return { success: false, error: 'Invalid image URL format' };
    }
    
    const profilePart = urlParts[profilesIndex + 1]; // Should be 'profile'
    const userId = urlParts[profilesIndex + 2]; // Should be the userId
    const filePath = `profile/${userId}`;

    const { error } = await supabase.storage
      .from('profiles')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting profile image:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteProfileImage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Converts a local image URI to base64 for web compatibility
 * @param uri - The local image URI
 * @returns Promise with base64 string
 */
export async function imageUriToBase64(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      const reader = new FileReader();
      reader.onloadend = function() {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
      };
      reader.onerror = reject;
    };
    xhr.onerror = reject;
    xhr.open('GET', uri);
    xhr.responseType = 'blob';
    xhr.send();
  });
}
