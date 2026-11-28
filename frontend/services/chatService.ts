import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';

export const translateMessage = async (
    text: string,
    targetLang: string = 'es'
): Promise<{ success: boolean; data?: { translatedText: string; cached: boolean }; msg?: string }> => {
    try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/api/translate`,
            { text, targetLang },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                timeout: 10000,
            }
        );
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            msg: error?.response?.data?.msg || error?.message || 'Translation failed',
        };
    }
};
