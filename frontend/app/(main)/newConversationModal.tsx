import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, TextInput, Platform } from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
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
import { getContacts, newConversation } from "../../socket/socketEvents";
import { uploadFileToCloudinary } from "../../services/imageService";
import * as Icons from 'phosphor-react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn, FadeOut } from 'react-native-reanimated';

const NewConversationModal = () => {
    const { isGroup } = useLocalSearchParams();
    const isGroupMode = isGroup == '1';
    const router = useRouter();
    const [contacts, setContacts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupAvatar, setGroupAvatar] = useState<{ uri: string } | null>(null);
    const [groupName, setGroupName] = useState("");
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const { user: currentUser } = useAuth();

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
        setIsLoading(false);
        if (res.success) {
            router.back();
            router.push({
                pathname: "/(main)/conversation",
                params: {
                    id: res.data._id,
                    name: res.data.name,
                    avatar: res.data.avatar,
                    type: res.data.type,
                    participants: JSON.stringify(res.data.participants),
                }
            });
        } else {
            Alert.alert("Error", res.msg);
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
            Alert.alert("Authentication", "Please login to start a conversation");
            return;
        }
        if (isGroupMode) {
            toggleParticipant(user);
        } else {
            newConversation({
                type: "direct",
                participants: [currentUser.id, user.id]
            });
        }
    };

    const createGroup = async () => {
        if (!groupName.trim() || !currentUser || selectedParticipants.length < 2) return;
        setIsLoading(true);
        try {
            let avatar = null;
            if (groupAvatar) {
                const uploadResult = await uploadFileToCloudinary(groupAvatar, "group-avatars");
                if (uploadResult.success) avatar = uploadResult.data;
            }
            newConversation({
                type: "group",
                participants: [currentUser.id, ...selectedParticipants],
                name: groupName.trim(),
                avatar,
            });
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setIsLoading(false);
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

    // Selected user objects for horizontal chips carousel
    const selectedUsers = useMemo(() => {
        return contacts.filter((c: any) => selectedParticipants.includes(c.id));
    }, [contacts, selectedParticipants]);

    return (
        <ScreenWrapper isModal={true}>
            <View style={styles.container}>

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(400).springify()}
                    style={styles.header}
                >
                    <BackButton color={colors.neutral800} iconSize={22} />
                    <View style={styles.headerTitleWrap}>
                        <Typo size={17} fontWeight="800" color={colors.neutral900}>
                            {isGroupMode ? "Create New Group" : "New Conversation"}
                        </Typo>
                        <Typo size={11} color={colors.neutral400} fontWeight="500">
                            {isGroupMode ? "Select at least 2 members" : "Choose someone to chat with"}
                        </Typo>
                    </View>
                    <View style={{ width: 22 }} />
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
                        {isGroupMode ? "SELECT MEMBERS" : "ALL CONTACTS"}
                    </Typo>
                    <Typo size={11} color={colors.neutral400} fontWeight="600">
                        {filteredContacts.length} available
                    </Typo>
                </Animated.View>

                {/* ── Contacts List ── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.contactList,
                        isGroupMode && selectedParticipants.length >= 2 && { paddingBottom: verticalScale(120) }
                    ]}
                >
                    {filteredContacts.length === 0 ? (
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

            </View>
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
        alignItems: 'center',
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
        paddingBottom: verticalScale(Platform.OS === 'ios' ? 35 : 20),
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
});
