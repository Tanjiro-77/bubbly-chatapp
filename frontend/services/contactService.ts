import axios from "axios";
import * as Contacts from "expo-contacts/legacy";
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
    canAskAgain: boolean;
    contacts: PhoneContactItem[];
}> => {
    let permission = await Contacts.getPermissionsAsync();
    if (permission.status !== Contacts.PermissionStatus.GRANTED) {
        permission = await Contacts.requestPermissionsAsync();
    }

    if (permission.status !== Contacts.PermissionStatus.GRANTED) {
        return {
            status: permission.status,
            canAskAgain: permission.canAskAgain ?? true,
            contacts: [],
        };
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

    return {
        status: permission.status,
        canAskAgain: permission.canAskAgain ?? true,
        contacts: list,
    };
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
    token: string,
    email?: string
): Promise<{ success: boolean; phoneNumber: string; email?: string; token?: string; msg?: string }> => {
    try {
        const response = await axios.put(
            `${API_URL}/api/user/phone`,
            { phoneNumber, ...(email ? { email } : {}) },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data;
    } catch (error: any) {
        console.error("updateUserPhoneNumber error:", error?.response?.data || error.message);
        throw new Error(error?.response?.data?.msg || "Failed to update contact details");
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
