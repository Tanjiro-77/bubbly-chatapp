import axios from "axios";
import * as Contacts from "expo-contacts";
import { API_URL } from "../constants";

export interface PhoneContactItem {
    id: string;
    name: string;
    phoneNumber: string;
}

export interface MatchedContactItem {
    id: string;
    _id: string;
    name: string;
    avatar?: string | null;
    email: string;
    phoneNumber?: string;
    isOnline?: boolean;
    lastSeen?: string | null;
}

/**
 * Normalizes phone numbers (removes brackets, hyphens, spaces).
 */
export const cleanPhoneNumber = (raw: string): string => {
    if (!raw) return "";
    return raw.replace(/[^\d+]/g, "").trim();
};

/**
 * Requests contact permission and fetches all contacts with phone numbers
 * from the device's native address book.
 */
export const fetchDevicePhoneContacts = async (): Promise<{
    status: Contacts.PermissionStatus;
    contacts: PhoneContactItem[];
}> => {
    try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== Contacts.PermissionStatus.GRANTED) {
            return { status, contacts: [] };
        }

        const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            sort: Contacts.SortTypes.FirstName,
        });

        const list: PhoneContactItem[] = [];
        const seenNumbers = new Set<string>();

        if (Array.isArray(data)) {
            for (const item of data) {
                if (item.phoneNumbers && Array.isArray(item.phoneNumbers)) {
                    for (const phoneObj of item.phoneNumbers) {
                        if (phoneObj.number) {
                            const cleaned = cleanPhoneNumber(phoneObj.number);
                            if (cleaned.length >= 7 && !seenNumbers.has(cleaned)) {
                                seenNumbers.add(cleaned);
                                list.push({
                                    id: item.id || `${item.name}_${cleaned}`,
                                    name: item.name || phoneObj.number,
                                    phoneNumber: cleaned,
                                });
                            }
                        }
                    }
                }
            }
        }

        return { status, contacts: list };
    } catch (error) {
        console.error("fetchDevicePhoneContacts error:", error);
        return { status: Contacts.PermissionStatus.DENIED, contacts: [] };
    }
};

/**
 * Sends a list of phone numbers to the backend to discover which friends are on Bubbly.
 */
export const syncContactsWithBackend = async (
    phoneNumbers: string[],
    token: string
): Promise<{ matchedContacts: MatchedContactItem[]; totalMatched: number }> => {
    try {
        const response = await axios.post(
            `${API_URL}/api/contacts/sync`,
            { phoneNumbers },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("syncContactsWithBackend error:", error?.response?.data || error.message);
        throw new Error(error?.response?.data?.msg || "Failed to sync contacts");
    }
};

/**
 * Updates the current user's phone number on Bubbly so their friends can discover them.
 */
export const updateUserPhoneNumber = async (
    phoneNumber: string,
    token: string
): Promise<{ success: boolean; phoneNumber: string; token?: string; msg?: string }> => {
    try {
        const response = await axios.put(
            `${API_URL}/api/user/phone`,
            { phoneNumber },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("updateUserPhoneNumber error:", error?.response?.data || error.message);
        throw new Error(error?.response?.data?.msg || "Failed to update phone number");
    }
};

/**
 * Find a single registered Bubbly user by exact phone number (WhatsApp-style).
 */
export const findUserByPhoneNumber = async (
    phoneNumber: string,
    token: string
): Promise<{ success: boolean; user?: MatchedContactItem; msg?: string }> => {
    try {
        const response = await axios.post(
            `${API_URL}/api/contacts/find`,
            { phoneNumber },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        throw new Error(error?.response?.data?.msg || "No account found for this phone number");
    }
};
