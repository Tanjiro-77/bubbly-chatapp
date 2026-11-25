import axios from 'axios';
import { API_URL } from "../constants";

export const login = async (email: string, password: string): Promise<{ token: string }> => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        })
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.msg || "Login failed";
        throw new Error(msg);
    }
}

export const loginWithPhone = async (phoneNumber: string, password: string): Promise<{ token: string }> => {
    try {
        const response = await axios.post(`${API_URL}/auth/phone/login`, {
            phoneNumber,
            password,
        });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.msg || "Phone login failed";
        throw new Error(msg);
    }
};

export const register = async (email: string, password: string, name: string, avatar?: string | null, phoneNumber?: string): Promise<{ token: string }> => {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            name,
            avatar,
            ...(phoneNumber ? { phoneNumber } : {}),
        });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.msg || "Registration failed";
        throw new Error(msg);
    }
};

export const registerWithPhone = async (phoneNumber: string, password: string, name: string, avatar?: string | null): Promise<{ token: string }> => {
    try {
        const response = await axios.post(`${API_URL}/auth/phone/register`, {
            phoneNumber,
            password,
            name,
            avatar,
        });
        return response.data;
    } catch (error: any) {
        const msg = error?.response?.data?.msg || "Phone registration failed";
        throw new Error(msg);
    }
};

export const googleLogin = async (payload: {
    idToken?: string;
    accessToken?: string;
    email?: string;
    name?: string;
    avatar?: string;
    googleId?: string;
}): Promise<{ token: string; user?: any }> => {
    try {
        const response = await axios.post(`${API_URL}/auth/google`, payload);
        return response.data;
    } catch (error: any) {
        console.log("googleLogin error:", error?.response?.data || error.message);
        const msg = error?.response?.data?.msg || "Google login failed";
        throw new Error(msg);
    }
};
