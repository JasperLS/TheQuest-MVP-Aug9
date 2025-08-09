import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Camera, FlipHorizontal2, Image as ImageIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<any>(null);
  const router = useRouter();
  const { identifyAnimal, setLastIdentificationResult } = useAppContext();
  const { session } = useAuth();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const handleCapture = async () => {
    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);
        if (Platform.OS !== 'web') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.9 });
        await processImage(photo);
      } catch (error) {
        console.error('Error capturing image:', error);
        Alert.alert('Capture Error', 'Unable to capture image. Please try again.');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await processImage(result.assets[0]);
    }
  };

  const processImage = async (asset: { uri: string; base64?: string }) => {
    try {
      // Prefer real backend identification. Fallback to mock identify if anything fails.
      if (!session) {
        throw new Error('No active session');
      }

      const accessToken = session.access_token;
      const imageBase64 = asset.base64 || (await readAsBase64(asset.uri));

      const response = await fetch('https://qrvnlnjymdwhndcxruvp.supabase.co/functions/v1/identify-species', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ imageBase64 }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        // Try to parse JSON error and surface a clean message
        let serverErrorMessage = `Request failed with ${response.status}`;
        try {
          const parsed = JSON.parse(responseText);
          serverErrorMessage = parsed?.error || parsed?.message || serverErrorMessage;
        } catch (_) {
          if (responseText) serverErrorMessage = responseText;
        }
        throw new Error(serverErrorMessage);
      }

      // Response OK: parse JSON body
      const result = JSON.parse(responseText);
      setLastIdentificationResult(result);
      router.push('/identification/result?source=camera');
    } catch (error) {
      console.error('Error identifying animal:', error);
      const message = normalizeErrorMessage(error);
      Alert.alert('Identification Error', message);
      // Fallback to mock flow if needed
      try {
        const id = await identifyAnimal(asset.uri);
        if (id) {
          router.push(`/identification/${id}?source=camera`);
        }
      } catch (_) {}
    }
  };

  async function readAsBase64(uri: string): Promise<string> {
    // expo-file-system is not currently imported in this file; use a dynamic import
    const FileSystem = await import('expo-file-system');
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return b64;
  }

  function normalizeErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      const m = err.message?.trim();
      // If message looks like JSON, try to extract a clean error message
      if (m?.startsWith('{') || m?.startsWith('[')) {
        try {
          const parsed = JSON.parse(m);
          return parsed?.error || parsed?.message || m;
        } catch (_) {
          return m;
        }
      }
      return m || 'Unknown error';
    }
    try {
      return JSON.stringify(err);
    } catch (_) {
      return 'Unknown error';
    }
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#2E7D32', '#1B5E20']}
          style={styles.permissionContainer}
        >
          <Camera color="#fff" size={60} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to help you identify animals in the wild
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </LinearGradient>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        testID="wildlife-camera"
      />
      <View style={[styles.overlay, StyleSheet.absoluteFillObject]} pointerEvents="box-none">
        <View style={styles.topControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
            disabled={isCapturing}
            testID="flip-camera-button"
          >
            <FlipHorizontal2 color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickImage}
            disabled={isCapturing}
            testID="gallery-button"
          >
            <ImageIcon color="#fff" size={24} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.capturingButton]}
            onPress={handleCapture}
            disabled={isCapturing}
            testID="capture-button"
          >
            {isCapturing ? (
              <ActivityIndicator color="#2E7D32" size="large" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          <View style={styles.placeholderButton} />
        </View>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturingButton: {
    backgroundColor: '#f5f5f5',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  permissionButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
});