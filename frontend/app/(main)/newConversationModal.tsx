import { KeyboardAvoidingView, Linking, ScrollView, StyleSheet, TouchableOpacity, View, TextInput, Platform, Share, ActivityIndicator } from 'react-native';
import { BubblyAlert } from "../../components/BubblyAlert";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from "expo-router";
import ScreenWrapper from "../../components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import * as ImagePicker from 'expo-image-picker';
import Typo from "../../components/Typo";
import { useAuth } from "../../contexts/authContext";
import Button from "../../components/Button";
import { scale, verticalScale } from "../../utils/styling";
import { getContacts, newConversation, isSocketConnected } from "../../socket/socketEvents";
import { uploadFileToCloudinary } from "../../services/imageService";
import { fetchDevicePhoneContacts, syncContactsWithBackend, findUserByPhoneNumber, PhoneContactItem, MatchedContactItem } from "../../services/contactService";
import * as Icons from 'phosphor-react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, FadeOut } from 'react-native-reanimated';

const NewConversationModal = () => {
    const { isGroup } = useLocalSearchParams();
    const isGroupMode = isGroup == '1';
    const router = useRouter();
    const { user: currentUser, token } = useAuth();
    const [contacts, setContacts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupAvatar, setGroupAvatar] = useState<{ uri: string } | null>(null);
    const [groupName, setGroupName] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ── Phone Contacts Sync State ──
    const [phoneContacts, setPhoneContacts] = useState<PhoneContactItem[]>([]);
    const [matchedPhoneContacts, setMatchedPhoneContacts] = useState<MatchedContactItem[]>([]);
    const [isSyncingPhone, setIsSyncingPhone] = useState(false);
    const [hasSyncedPhone, setHasSyncedPhone] = useState(false);
    const [contactsTab, setContactsTab] = useState<'all' | 'phone'>('all');
    const [lookupPhone, setLookupPhone] = useState('');
    const [isLookingUpPhone, setIsLookingUpPhone] = useState(false);
    const awaitingCreateRef = useRef(false);

    useEffect(() => {
        getContacts(processGetContacts);
        newConversation(processNewConversation);
        getContacts(null);

        return () => {
            getContacts(processGetContacts, true);
            newConversation(processNewConversation, true);
        };
    }, []);

    const processGetContacts = (res: any) => {
        if (res.success) setContacts(res.data);
    };

    const processNewConversation = (res: any) => {
        if (!awaitingCreateRef.current) return;
        awaitingCreateRef.current = false;
        setIsLoading(false);
        if (res.success) {
            router.replace({
                pathname: "/(main)/conversation",
                params: {
                    id: res.data._id,
                    name: res.data.name,
                    avatar: res.data.avatar,
                    type: res.data.type,
                    participants: JSON.stringify(res.data.participants),
                    admins: JSON.stringify(res.data.admins || []),
                    createdBy: res.data.createdBy || "",
                }
            });
        } else {
            BubblyAlert.alert("Error", res.msg);
        }
    };

    const onPickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            aspect: [1, 1],
            quality: 0.6,
        });
        if (!result.canceled) setGroupAvatar(result.assets[0]);
    };

    const toggleParticipant = (user: any) => {
        setSelectedParticipants((prev: string[]) =>
            prev.includes(user.id)
                ? prev.filter((id: string) => id !== user.id)
                : [...prev, user.id]
        );
    };

    const onSelectUser = (user: any) => {
        if (!currentUser) {
            BubblyAlert.alert("Authentication", "Please login to start a conversation");
            return;
        }
        if (isGroupMode) {
            toggleParticipant(user);
        } else {
            if (!isSocketConnected()) {
                BubblyAlert.alert("Offline", "Connect to the internet to start a chat.");
                return;
            }
            awaitingCreateRef.current = true;
            setIsLoading(true);
            newConversation({
                type: "direct",
                participants: [currentUser.id, user.id]
            });
        }
    };

    const createGroup = async () => {
        if (!groupName.trim() || !currentUser || selectedParticipants.length < 2) return;
        if (!isSocketConnected()) {
            BubblyAlert.alert("Offline", "Connect to the internet to create a group.");
            return;
        }
        setIsLoading(true);
        try {
            let avatar = null;
            if (groupAvatar) {
                const uploadResult = await uploadFileToCloudinary(groupAvatar, "group-avatars");
                if (uploadResult.success) avatar = uploadResult.data;
            }
            awaitingCreateRef.current = true;
            newConversation({
                type: "group",
                participants: [currentUser.id, ...selectedParticipants],
                name: groupName.trim(),
                avatar,
            });
        } catch (error: any) {
            awaitingCreateRef.current = false;
            setIsLoading(false);
            BubblyAlert.alert("Error", error.message);
        }
    };

    const handleLookupByNumber = async () => {
        if (!token || !currentUser) return;
        const cleaned = lookupPhone.trim();
        if (!cleaned) return;
        setIsLookingUpPhone(true);
        try {
            const res = await findUserByPhoneNumber(cleaned, token);
            if (res.success && res.user) {
                setLookupPhone('');
                onSelectUser(res.user);
            }
        } catch (err: any) {
            BubblyAlert.alert("User Not Found", err.message || "No registered user has that phone number.");
        } finally {
            setIsLookingUpPhone(false);
        }
    };

    // Filter contacts based on search query
    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts;
        const q = searchQuery.toLowerCase().trim();
        return contacts.filter((c: any) =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
    }, [contacts, searchQuery]);

    const handleSyncPhoneContacts = async () => {
        if (!token) {
            BubblyAlert.alert("Authentication", "Please log in to sync contacts.");
            return;
        }

        setIsSyncingPhone(true);
        try {
            const { status, canAskAgain, contacts: fetchedList } = await fetchDevicePhoneContacts();
            if (status !== 'granted') {
                BubblyAlert.alert(
                    "Contact Access Needed",
                    canAskAgain
                        ? "Please allow contact access when prompted to discover which friends are on Bubbly."
                        : "Please allow contact access in your phone settings to discover which friends are on Bubbly.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open Settings", onPress: () => Linking.openSettings().catch(() => {}) },
                    ]
                );
                setIsSyncingPhone(false);
                return;
            }

            setPhoneContacts(fetchedList);

            if (fetchedList.length === 0) {
                BubblyAlert.alert("No Contacts Found", "No contacts with valid phone numbers were found on your device.");
                setIsSyncingPhone(false);
                return;
            }

            const numbers = fetchedList.map(c => c.phoneNumber);
            const syncResult = await syncContactsWithBackend(numbers, token);
            setMatchedPhoneContacts(syncResult.matchedContacts);
            setHasSyncedPhone(true);
            setContactsTab('phone');

            if (syncResult.matchedContacts.length > 0) {
                BubblyAlert.alert(
                    "Contacts Synced 🎉",
                    `Found ${syncResult.matchedContacts.length} ${syncResult.matchedContacts.length === 1 ? 'friend' : 'friends'} from your phone book on Bubbly!`
                );
            } else {
                BubblyAlert.alert(
                    "Contacts Synced",
                    "None of your phone contacts have joined Bubbly yet. You can invite them using the Invite button below!"
                );
            }
        } catch (err: any) {
            console.error("handleSyncPhoneContacts error:", err);
            BubblyAlert.alert("Sync Error", err.message || "Failed to sync device contacts");
        } finally {
            setIsSyncingPhone(false);
        }
    };

    const handleInviteContact = async (c: PhoneContactItem) => {
        try {
            await Share.share({
                title: "Invite to Bubbly",
                message: `Hey ${c.name}! Join me on Bubbly Messenger to chat, make crystal-clear calls, and share stories: https://bubbly.chat`,
            });
        } catch (_) {}
    };

    // Filter phone contacts based on search query
    const filteredPhoneContacts = useMemo(() => {
        if (!searchQuery.trim()) return phoneContacts;
        const q = searchQuery.toLowerCase().trim();
        return phoneContacts.filter((c: PhoneContactItem) =>
            c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q)
        );
    }, [phoneContacts, searchQuery]);

    // Selected user objects for horizontal chips carousel (checks both All and Matched Phone users)
    const selectedUsers = useMemo(() => {
        const map = new Map<string, any>();
        contacts.forEach((c: any) => { if (selectedParticipants.includes(c.id)) map.set(c.id, c); });
        matchedPhoneContacts.forEach((c: any) => { if (selectedParticipants.includes(c.id) && !map.has(c.id)) map.set(c.id, c); });
        return Array.from(map.values());
    }, [contacts, matchedPhoneContacts, selectedParticipants]);

    return (
        <ScreenWrapper isModal={true}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(400).springify()}
                    style={styles.header}
                >
                    <BackButton color={colors.neutral800} iconSize={22} />
                    <View style={styles.headerTitleWrap}>
                        <Typo size={17} fontWeight="800" color={colors.neutral900} textProps={{ numberOfLines: 1 }}>
                            {isGroupMode ? "Create New Group" : "New Conversation"}
                        </Typo>
                        <Typo size={11} color={colors.neutral400} fontWeight="500" textProps={{ numberOfLines: 1 }}>
                            {isGroupMode ? "Select at least 2 members" : "Choose someone to chat with"}
                        </Typo>
                    </View>
                    <View style={{ width: verticalScale(36) }} />
                </Animated.View>

                {/* ── Search Bar ── */}
                <Animated.View
                    entering={FadeInDown.duration(450).delay(80).springify()}
                    style={styles.searchContainer}
                >
                    <Icons.MagnifyingGlass size={18} color={colors.neutral400} weight="bold" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search contacts by name or email..."
                        placeholderTextColor={colors.neutral400}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                            <Icons.XCircle size={18} color={colors.neutral400} weight="fill" />
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* ── Group Mode Setup Header ── */}
                {isGroupMode && (
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(120).springify()}
                        style={styles.groupSetup}
                    >
                        {/* Group Avatar Picker */}
                        <TouchableOpacity
                            onPress={onPickImage}
                            activeOpacity={0.8}
                            style={styles.groupAvatarWrap}
                        >
                            <Avatar
                                uri={groupAvatar?.uri || null}
                                size={74}
                                isGroup={true}
                            />
                            <View style={styles.cameraOverlay}>
                                <Icons.Camera
                                    size={14}
                                    color={colors.neutral700}
                                    weight="bold"
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Group Name Field */}
                        <View style={styles.groupNameWrap}>
                            <Typo
                                size={11}
                                fontWeight="700"
                                color={colors.neutral500}
                                style={styles.fieldLabel}
                            >
                                GROUP SUBJECT
                            </Typo>
                            <View style={styles.groupInputWrap}>
                                <Icons.UsersThree
                                    size={18}
                                    color={colors.neutral400}
                                    weight="bold"
                                />
                                <TextInput
                                    style={styles.groupTextInput}
                                    placeholder="Enter group name (e.g. Design Team)"
                                    placeholderTextColor={colors.neutral400}
                                    value={groupName}
                                    onChangeText={setGroupName}
                                    maxLength={40}
                                />
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* ── Horizontal Selected Participants Chips ── */}
                {isGroupMode && selectedUsers.length > 0 && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={styles.chipsSection}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsScroll}
                        >
                            {selectedUsers.map((u: any) => (
                                <View key={u.id} style={styles.chipPill}>
                                    <Avatar size={24} uri={u.avatar} />
                                    <Typo size={12} fontWeight="600" color={colors.neutral800}>
                                        {u.name?.split(' ')[0]}
                                    </Typo>
                                    <TouchableOpacity
                                        onPress={() => toggleParticipant(u)}
                                        activeOpacity={0.7}
                                        style={styles.chipRemove}
                                    >
                                        <Icons.X size={12} color={colors.neutral500} weight="bold" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* ── Start Chat by Exact Phone Number (Private Discovery) ── */}
                {!isGroupMode && (
                    <View style={styles.lookupRow}>
                        <Icons.Phone size={17} color={colors.neutral500} weight="bold" />
                        <TextInput
                            style={styles.lookupInput}
                            placeholder="Message a phone number (e.g. +919876543210)"
                            placeholderTextColor={colors.neutral400}
                            keyboardType="phone-pad"
                            value={lookupPhone}
                            onChangeText={setLookupPhone}
                            returnKeyType="search"
                            onSubmitEditing={handleLookupByNumber}
                        />
                        <TouchableOpacity
                            style={[styles.lookupBtn, !lookupPhone.trim() && { opacity: 0.45 }]}
                            onPress={handleLookupByNumber}
                            disabled={isLookingUpPhone || !lookupPhone.trim()}
                            activeOpacity={0.8}
                        >
                            {isLookingUpPhone ? (
                                <ActivityIndicator size="small" color={colors.neutral900} />
                            ) : (
                                <Typo size={12} fontWeight="800" color={colors.neutral900}>Chat</Typo>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Device Contacts Sync Banner ── */}
                <TouchableOpacity
                    style={styles.syncCard}
                    onPress={handleSyncPhoneContacts}
                    activeOpacity={0.8}
                    disabled={isSyncingPhone}
                >
                    <View style={styles.syncIconWrap}>
                        <Icons.AddressBook size={20} color={colors.primaryDark} weight="fill" />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Typo size={13.5} fontWeight="700" color={colors.neutral900}>
                            {isSyncingPhone ? "Scanning Device Contacts..." : "Sync Phone Contacts"}
                        </Typo>
                        <Typo size={11} color={colors.neutral500}>
                            {hasSyncedPhone
                                ? `${matchedPhoneContacts.length} friends found on Bubbly`
                                : "Discover which friends in your address book use Bubbly"}
                        </Typo>
                    </View>
                    {isSyncingPhone ? (
                        <ActivityIndicator size="small" color={colors.neutral900} />
                    ) : (
                        <View style={styles.syncActionBadge}>
                            <Typo size={11.5} fontWeight="800" color={colors.neutral900}>
                                {hasSyncedPhone ? "Re-sync" : "Sync Now"}
                            </Typo>
                        </View>
                    )}
                </TouchableOpacity>

                {/* ── Segmented Tabs (All Users vs Phone Contacts) ── */}
                {hasSyncedPhone && (
                    <View style={styles.segmentedTabs}>
                        <TouchableOpacity
                            style={[styles.tabBtn, contactsTab === 'all' && styles.tabBtnActive]}
                            onPress={() => setContactsTab('all')}
                            activeOpacity={0.7}
                        >
                            <Typo size={12.5} fontWeight={contactsTab === 'all' ? "700" : "500"} color={contactsTab === 'all' ? colors.neutral900 : colors.neutral400}>
                                My Contacts ({filteredContacts.length})
                            </Typo>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabBtn, contactsTab === 'phone' && styles.tabBtnActive]}
                            onPress={() => setContactsTab('phone')}
                            activeOpacity={0.7}
                        >
                            <Typo size={12.5} fontWeight={contactsTab === 'phone' ? "700" : "500"} color={contactsTab === 'phone' ? colors.neutral900 : colors.neutral400}>
                                Phone Book ({matchedPhoneContacts.length} on Bubbly)
                            </Typo>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Contacts Section Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(500).delay(150).springify()}
                    style={styles.sectionRow}
                >
                    <Typo
                        size={11}
                        fontWeight="800"
                        color={colors.neutral400}
                        style={styles.sectionLabel}
                    >
                        {isGroupMode
                            ? "SELECT MEMBERS"
                            : contactsTab === 'phone'
                            ? "PHONE ADDRESS BOOK"
                            : "SAVED CHATS & CONTACTS"}
                    </Typo>
                    <Typo size={11} color={colors.neutral400} fontWeight="600">
                        {contactsTab === 'phone' ? `${phoneContacts.length} phone contacts` : `${filteredContacts.length} available`}
                    </Typo>
                </Animated.View>

                {/* ── Contacts List ── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[
                        styles.contactList,
                        isGroupMode && selectedParticipants.length >= 2 && { paddingBottom: verticalScale(120) }
                    ]}
                >
                    {contactsTab === 'phone' ? (
                        <View style={{ gap: spacingY._12 }}>
                            {/* Matched Bubbly Friends */}
                            <View style={styles.phoneGroupHeader}>
                                <Icons.Sparkle size={15} color={colors.primaryDark} weight="fill" />
                                <Typo size={12} fontWeight="800" color={colors.neutral700}>
                                    FRIENDS ON BUBBLY ({matchedPhoneContacts.length})
                                </Typo>
                            </View>

                            {matchedPhoneContacts.length === 0 ? (
                                <View style={styles.phoneEmptySub}>
                                    <Typo size={13} color={colors.neutral500} style={{ textAlign: "center" }}>
                                        No phone contacts matched with registered Bubbly accounts yet.
                                    </Typo>
                                </View>
                            ) : (
                                matchedPhoneContacts.map((user: MatchedContactItem, index: number) => {
                                    const isSelected = selectedParticipants.includes(user.id);
                                    return (
                                        <View key={user.id || index}>
                                            <TouchableOpacity
                                                style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                                                onPress={() => onSelectUser(user)}
                                                activeOpacity={0.7}
                                            >
                                                <Avatar size={48} uri={user.avatar} />
                                                <View style={styles.contactInfo}>
                                                    <Typo size={15} fontWeight="700" color={colors.neutral900}>
                                                        {user.name}
                                                    </Typo>
                                                    <Typo size={12} color={colors.neutral400}>
                                                        {user.phoneNumber || user.email}
                                                    </Typo>
                                                </View>
                                                {isGroupMode ? (
                                                    <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                                                        {isSelected && <Icons.Check size={12} color={colors.white} weight="bold" />}
                                                    </View>
                                                ) : (
                                                    <View style={styles.directArrowWrap}>
                                                        <Icons.ChatCircleDots size={18} color={colors.primaryDark} weight="fill" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                            {index < matchedPhoneContacts.length - 1 && <View style={styles.divider} />}
                                        </View>
                                    );
                                })
                            )}

                            {/* Other Phone Contacts to Invite */}
                            <View style={[styles.phoneGroupHeader, { marginTop: spacingY._15 }]}>
                                <Icons.AddressBook size={15} color={colors.neutral500} weight="fill" />
                                <Typo size={12} fontWeight="800" color={colors.neutral500}>
                                    INVITE TO BUBBLY ({filteredPhoneContacts.length})
                                </Typo>
                            </View>

                            {filteredPhoneContacts.slice(0, 100).map((c: PhoneContactItem, index: number) => (
                                <View key={c.id || index}>
                                    <View style={styles.inviteRow}>
                                        <View style={styles.inviteAvatar}>
                                            <Typo size={16} fontWeight="700" color={colors.neutral700}>
                                                {c.name.charAt(0).toUpperCase()}
                                            </Typo>
                                        </View>
                                        <View style={styles.contactInfo}>
                                            <Typo size={14.5} fontWeight="600" color={colors.neutral900}>
                                                {c.name}
                                            </Typo>
                                            <Typo size={12} color={colors.neutral400}>
                                                {c.phoneNumber}
                                            </Typo>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.inviteBtn}
                                            onPress={() => handleInviteContact(c)}
                                            activeOpacity={0.7}
                                        >
                                            <Typo size={12} fontWeight="700" color={colors.primaryDark}>
                                                Invite
                                            </Typo>
                                        </TouchableOpacity>
                                    </View>
                                    {index < Math.min(filteredPhoneContacts.length, 100) - 1 && <View style={styles.divider} />}
                                </View>
                            ))}
                        </View>
                    ) : filteredContacts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Icons.Users
                                    size={verticalScale(28)}
                                    color={colors.neutral300}
                                    weight="bold"
                                />
                            </View>
                            <Typo size={15} fontWeight="700" color={colors.neutral600}>
                                {searchQuery ? "No matching contacts found" : "No contacts available yet"}
                            </Typo>
                            <Typo size={12} color={colors.neutral400} style={{ textAlign: 'center' }}>
                                {searchQuery ? "Try searching for a different name or email" : "When friends join Bubbly, they will appear here automatically"}
                            </Typo>
                        </View>
                    ) : (
                        filteredContacts.map((user: any, index: number) => {
                            const isSelected = selectedParticipants.includes(user.id);

                            return (
                                <Animated.View
                                    key={user.id || index}
                                    entering={FadeInDown.duration(350).delay(index * 25).springify()}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.contactRow,
                                            isSelected && styles.contactRowSelected,
                                        ]}
                                        onPress={() => onSelectUser(user)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.contactAvatar}>
                                            <Avatar size={48} uri={user.avatar} />
                                        </View>

                                        <View style={styles.contactInfo}>
                                            <Typo size={15} fontWeight="700" color={colors.neutral900}>
                                                {user.name}
                                            </Typo>
                                            {user.email && (
                                                <Typo size={12} color={colors.neutral400} fontWeight="400">
                                                    {user.email}
                                                </Typo>
                                            )}
                                        </View>

                                        {isGroupMode ? (
                                            <View style={[
                                                styles.checkCircle,
                                                isSelected && styles.checkCircleActive
                                            ]}>
                                                {isSelected && (
                                                    <Icons.Check
                                                        size={12}
                                                        color={colors.black}
                                                        weight="bold"
                                                    />
                                                )}
                                            </View>
                                        ) : (
                                            <View style={styles.directArrowWrap}>
                                                <Icons.ChatCircleDots
                                                    size={18}
                                                    color={colors.primaryDark}
                                                    weight="fill"
                                                />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {index < filteredContacts.length - 1 && (
                                        <View style={styles.divider} />
                                    )}
                                </Animated.View>
                            );
                        })
                    )}
                </ScrollView>

                {/* ── Create Group Sticky Footer ── */}
                {isGroupMode && selectedParticipants.length >= 2 && (
                    <Animated.View
                        entering={FadeInUp.duration(400).springify()}
                        style={styles.footer}
                    >
                        <View style={styles.footerMeta}>
                            <View style={styles.footerBadge}>
                                <Typo size={12} fontWeight="800" color={colors.primaryDark}>
                                    {selectedParticipants.length} MEMBERS
                                </Typo>
                            </View>
                            <Typo size={12} color={colors.neutral500} fontWeight="500">
                                {!groupName.trim() ? "Give your group a name above" : "Tap create to start chatting!"}
                            </Typo>
                        </View>
                        <Button
                            onPress={createGroup}
                            loading={isLoading}
                            style={[
                                styles.createBtn,
                                !groupName.trim() && { opacity: 0.5 }
                            ] as any}
                        >
                            <Typo fontWeight="800" size={15} color={colors.black}>
                                Create Group Chat
                            </Typo>
                        </Button>
                    </Animated.View>
                )}

            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

export default NewConversationModal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacingX._20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: spacingY._15,
        paddingBottom: spacingY._15,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    headerTitleWrap: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        paddingHorizontal: spacingX._8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral50,
        borderRadius: radius.full,
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(Platform.OS === 'ios' ? 10 : 6),
        borderWidth: 1,
        borderColor: colors.neutral200,
        marginTop: spacingY._15,
        gap: spacingX._10,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        fontSize: verticalScale(14),
        color: colors.neutral800,
    },
    groupSetup: {
        alignItems: "center",
        paddingVertical: spacingY._15,
        gap: spacingY._12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    groupAvatarWrap: {
        position: "relative",
    },
    cameraOverlay: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: colors.white,
        borderRadius: radius.full,
        padding: spacingY._5,
        borderWidth: 1.5,
        borderColor: colors.primary,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    groupNameWrap: {
        width: "100%",
        gap: spacingY._5,
    },
    fieldLabel: {
        letterSpacing: 1.2,
        marginLeft: 4,
    },
    groupInputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral50,
        borderRadius: radius._15,
        paddingHorizontal: spacingX._15,
        paddingVertical: verticalScale(Platform.OS === 'ios' ? 12 : 8),
        borderWidth: 1,
        borderColor: colors.neutral200,
        gap: spacingX._10,
    },
    groupTextInput: {
        flex: 1,
        fontSize: verticalScale(14),
        color: colors.neutral800,
    },
    chipsSection: {
        paddingVertical: spacingY._10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    chipsScroll: {
        gap: spacingX._8,
    },
    chipPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.full,
        paddingVertical: 4,
        paddingHorizontal: spacingX._8,
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.3)',
    },
    chipRemove: {
        width: 18,
        height: 18,
        borderRadius: radius.full,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacingY._15,
        paddingBottom: spacingY._10,
        paddingHorizontal: 4,
    },
    sectionLabel: {
        letterSpacing: 1.2,
    },
    contactList: {
        paddingBottom: verticalScale(40),
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacingY._12,
        paddingHorizontal: spacingX._8,
        borderRadius: radius._15,
        gap: spacingX._12,
    },
    contactRowSelected: {
        backgroundColor: 'rgba(245,158,11,0.08)',
    },
    contactAvatar: {},
    contactInfo: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    checkCircle: {
        width: scale(22),
        height: scale(22),
        borderRadius: radius.full,
        borderWidth: 2,
        borderColor: colors.neutral300,
        alignItems: "center",
        justifyContent: "center",
    },
    checkCircleActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    directArrowWrap: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral100,
        marginLeft: scale(65),
    },
    emptyState: {
        alignItems: "center",
        gap: spacingY._10,
        paddingTop: verticalScale(50),
        paddingHorizontal: spacingX._30,
    },
    emptyIconWrap: {
        backgroundColor: colors.neutral100,
        padding: spacingY._17,
        borderRadius: radius._24,
        marginBottom: spacingY._5,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.neutral100,
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._12,
        paddingBottom: spacingY._12,
        gap: spacingY._10,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8,
    },
    footerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacingX._10,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    createBtn: {
        height: verticalScale(52),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    lookupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._8,
        backgroundColor: colors.neutral50,
        borderWidth: 1,
        borderColor: colors.neutral200,
        borderRadius: radius._15,
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(6),
        marginTop: spacingY._10,
    },
    lookupInput: {
        flex: 1,
        fontSize: verticalScale(13.5),
        color: colors.neutral900,
        paddingVertical: verticalScale(4),
    },
    lookupBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacingX._12,
        paddingVertical: verticalScale(7),
        borderRadius: radius.full,
    },
    syncCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._12,
        backgroundColor: colors.white,
        borderRadius: radius._20,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._12,
        borderWidth: 1,
        borderColor: colors.cardBorderSubtle,
        marginTop: spacingY._12,
        marginBottom: spacingY._5,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    syncIconWrap: {
        width: verticalScale(40),
        height: verticalScale(40),
        borderRadius: radius.full,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    syncActionBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._6,
        borderRadius: radius.full,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentedTabs: {
        flexDirection: 'row',
        backgroundColor: colors.neutral100,
        borderRadius: radius._12,
        padding: 3,
        marginTop: spacingY._10,
        marginBottom: spacingY._5,
        gap: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: verticalScale(8),
        alignItems: 'center',
        borderRadius: radius._10,
    },
    tabBtnActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    phoneGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        paddingTop: spacingY._10,
        paddingBottom: spacingY._5,
    },
    phoneEmptySub: {
        paddingVertical: spacingY._15,
        alignItems: 'center',
    },
    inviteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacingY._10,
        paddingHorizontal: spacingX._8,
        gap: spacingX._12,
    },
    inviteAvatar: {
        width: scale(42),
        height: scale(42),
        borderRadius: radius.full,
        backgroundColor: colors.neutral200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteBtn: {
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._6,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: colors.primary,
    },
});
