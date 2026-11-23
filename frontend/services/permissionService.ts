import { Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule } from 'expo-audio';
import * as Notifications from 'expo-notifications';

export interface SinglePermissionStatus {
    granted: boolean;
    canAskAgain: boolean;
    status: string;
}

export interface AllPermissionsStatus {
    camera: SinglePermissionStatus;
    microphone: SinglePermissionStatus;
    mediaLibrary: SinglePermissionStatus;
    notifications: SinglePermissionStatus;
}

export type PermissionKey = 'camera' | 'microphone' | 'mediaLibrary' | 'notifications';

export interface PermissionMetadata {
    key: PermissionKey;
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    icon: string;
    isOptional: boolean;
}

export const PERMISSION_METADATA: Record<PermissionKey, PermissionMetadata> = {
    camera: {
        key: 'camera',
        title: 'Camera',
        subtitle: 'Photos, videos & video calls',
        description: 'Take profile photos, capture moments for stories and chats, and connect face-to-face in video calls.',
        features: ['Profile pictures', 'Story captures', 'Video calling'],
        icon: 'camera',
        isOptional: true,
    },
    microphone: {
        key: 'microphone',
        title: 'Microphone',
        subtitle: 'Voice notes & calls',
        description: 'Record high-quality voice messages and speak naturally during voice and video calls.',
        features: ['Voice messages', 'Audio calls', 'Video calls'],
        icon: 'mic',
        isOptional: true,
    },
    mediaLibrary: {
        key: 'mediaLibrary',
        title: 'Photos & Media',
        subtitle: 'Share images, videos & docs',
        description: 'Browse your photo gallery to send pictures, videos, and custom avatars to your friends.',
        features: ['Send gallery photos', 'Share videos', 'Custom avatar upload'],
        icon: 'photo-library',
        isOptional: true,
    },
    notifications: {
        key: 'notifications',
        title: 'Notifications',
        subtitle: 'Alerts for messages & calls',
        description: 'Get notified in real time when you receive new chat messages, incoming calls, or story updates.',
        features: ['Instant message alerts', 'Incoming call rings', 'Story updates'],
        icon: 'notifications',
        isOptional: true,
    },
};

/**
 * Check Camera permission status
 */
export const checkCameraPermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await ImagePicker.getCameraPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'undetermined' };
    }
};

/**
 * Request Camera permission
 */
export const requestCameraPermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await ImagePicker.requestCameraPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'denied' };
    }
};

/**
 * Check Microphone permission status
 */
export const checkMicrophonePermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await AudioModule.getRecordingPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'undetermined' };
    }
};

/**
 * Request Microphone permission
 */
export const requestMicrophonePermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await AudioModule.requestRecordingPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'denied' };
    }
};

/**
 * Check Photos / Media Library permission status
 */
export const checkMediaLibraryPermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await ImagePicker.getMediaLibraryPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'undetermined' };
    }
};

/**
 * Request Photos / Media Library permission
 */
export const requestMediaLibraryPermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'denied' };
    }
};

/**
 * Check Notification permission status
 */
export const checkNotificationPermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await Notifications.getPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'undetermined' };
    }
};

/**
 * Request Notification permission
 */
export const requestNotificationPermission = async (): Promise<SinglePermissionStatus> => {
    try {
        const res = await Notifications.requestPermissionsAsync();
        return {
            granted: res.granted,
            canAskAgain: res.canAskAgain,
            status: res.status,
        };
    } catch {
        return { granted: false, canAskAgain: true, status: 'denied' };
    }
};

/**
 * Check all 4 permissions in parallel
 */
export const checkAllPermissions = async (): Promise<AllPermissionsStatus> => {
    const [camera, microphone, mediaLibrary, notifications] = await Promise.all([
        checkCameraPermission(),
        checkMicrophonePermission(),
        checkMediaLibraryPermission(),
        checkNotificationPermission(),
    ]);
    return { camera, microphone, mediaLibrary, notifications };
};

/**
 * Request a single permission by key
 */
export const requestPermissionByKey = async (key: PermissionKey): Promise<SinglePermissionStatus> => {
    switch (key) {
        case 'camera':
            return requestCameraPermission();
        case 'microphone':
            return requestMicrophonePermission();
        case 'mediaLibrary':
            return requestMediaLibraryPermission();
        case 'notifications':
            return requestNotificationPermission();
        default:
            return { granted: false, canAskAgain: true, status: 'undetermined' };
    }
};

/**
 * Open Device Settings for Bubbly (when permission is permanently denied)
 */
export const openDeviceSettings = async (): Promise<void> => {
    try {
        await Linking.openSettings();
    } catch (e) {
        console.warn('Cannot open device settings', e);
    }
};
