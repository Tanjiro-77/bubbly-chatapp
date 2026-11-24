import axios from "axios";
import { API_URL } from "../constants";

export const translateMessage = async (
  text: string,
  targetLang: string = "es"
): Promise<{ success: boolean; data?: { translatedText: string; cached: boolean }; msg?: string }> => {
  try {
    const token = localStorage.getItem("bubbly_token");
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
      msg: error?.response?.data?.msg || error?.message || "Translation failed",
    };
  }
};

export const searchAll = async (
  query: string
): Promise<{ success: boolean; data?: any; msg?: string }> => {
  try {
    const token = localStorage.getItem("bubbly_token");
    const response = await axios.get(`${API_URL}/api/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 8000,
    });
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      msg: error?.response?.data?.msg || error?.message || "Search failed",
    };
  }
};
