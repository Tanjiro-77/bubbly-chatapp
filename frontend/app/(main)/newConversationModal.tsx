import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from "expo-router"
import ScreenWrapper from "../../components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "../../constants/theme";
import BackButton from "../../components/BackButton";
import Avatar from "../../components/Avatar";
import * as ImagePicker from 'expo-image-picker'
import Input from "../../components/Input";
import Typo from "../../components/Typo";
import { useAuth } from "../../contexts/authContext";
import Button from "../../components/Button";
import { scale, verticalScale } from "../../utils/styling";
import { getContacts, newConversation } from "../../socket/socketEvents";
import { uploadFileToCloudinary } from "../../services/imageService";
import * as Icons from 'phosphor-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const NewConversationModal = () => {

    const { isGroup } = useLocalSearchParams();
    const isGroupMode = isGroup == '1';
    const router = useRouter();
    const [contacts, setContacts] = useState([]);
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
            aspect: [4, 3],
            quality: 0.5,
        });
        if (!result.canceled) setGroupAvatar(result.assets[0]);
    };

    const toggleParticipant = (user: any) => {
        setSelectedParticipants((prev: any) =>
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
                name: groupName,
                avatar,
            });
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScreenWrapper isModal={true}>
            <View style={styles.container}>

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(400).springify()}
                    style={styles.header}
                >
                    <BackButton color={colors.neutral800} iconSize={22} />
                    <Typo size={17} fontWeight="700" color={colors.neutral900}>
                        {isGroupMode ? "New Group" : "New Message"}
                    </Typo>
                    {/* Spacer to center title */}
                    <View style={{ width: 22 }} />
                </Animated.View>

                {/* ── Group Setup ── */}
                {isGroupMode && (
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(100).springify()}
                        style={styles.groupSetup}
                    >
                        {/* Avatar picker */}
                        <TouchableOpacity
                            onPress={onPickImage}
                            activeOpacity={0.8}
                            style={styles.groupAvatarWrap}
                        >
                            <Avatar
                                uri={groupAvatar?.uri || null}
                                size={80}
                                isGroup={true}
                            />
                            <View style={styles.cameraOverlay}>
                                <Icons.Camera
                                    size={verticalScale(14)}
                                    color={colors.neutral700}
                                    weight="bold"
                                />
                            </View>
                        </TouchableOpacity>

                        {/* Group name input */}
                        <View style={styles.groupNameWrap}>
                            <Typo
                                size={12}
                                fontWeight="600"
                                color={colors.neutral500}
                                style={styles.fieldLabel}
                            >
                                GROUP NAME
                            </Typo>
                            <Input
                                placeholder="e.g. Project Team"
                                value={groupName}
                                onChangeText={setGroupName}
                                icon={
                                    <Icons.Users
                                        size={verticalScale(18)}
                                        color={colors.neutral400}
                                        weight="regular"
                                    />
                                }
                            />
                        </View>

                        {/* Selected count */}
                        {selectedParticipants.length > 0 && (
                            <View style={styles.selectedPill}>
                                <Icons.Check
                                    size={verticalScale(12)}
                                    color={colors.neutral700}
                                    weight="bold"
                                />
                                <Typo size={12} fontWeight="600" color={colors.neutral700}>
                                    {selectedParticipants.length} selected
                                </Typo>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* ── Section Label ── */}
                <Animated.View
                    entering={FadeInDown.duration(500).delay(150).springify()}
                    style={styles.sectionRow}
                >
                    <Typo
                        size={11}
                        fontWeight="700"
                        color={colors.neutral400}
                        style={styles.sectionLabel}
                    >
                        {isGroupMode ? "ADD PARTICIPANTS" : "CONTACTS"}
                    </Typo>
                    {contacts.length > 0 && (
                        <Typo size={11} color={colors.neutral400}>
                            {contacts.length} people
                        </Typo>
                    )}
                </Animated.View>

                {/* ── Contact List ── */}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.contactList,
                        isGroupMode && selectedParticipants.length >= 2 && { paddingBottom: verticalScale(110) }
                    ]}
                >
                    {contacts.length === 0 && (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Icons.UsersThree
                                    size={verticalScale(30)}
                                    color={colors.neutral300}
                                    weight="regular"
                                />
                            </View>
                            <Typo size={14} fontWeight="600" color={colors.neutral500}>
                                No contacts found
                            </Typo>
                            <Typo size={12} color={colors.neutral400} style={{ textAlign: 'center' }}>
                                Contacts will appear here once they join Bubbly
                            </Typo>
                        </View>
                    )}

                    {contacts.map((user: any, index) => {
                        const isSelected = selectedParticipants.includes(user.id);

                        return (
                            <Animated.View
                                key={index}
                                entering={FadeInDown.duration(400).delay(index * 40).springify()}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.contactRow,
                                        isSelected && styles.contactRowSelected,
                                    ]}
                                    onPress={() => onSelectUser(user)}
                                    activeOpacity={0.7}
                                >
                                    {/* Avatar */}
                                    <View style={styles.contactAvatar}>
                                        <Avatar size={46} uri={user.avatar} />
                                    </View>

                                    {/* Info */}
                                    <View style={styles.contactInfo}>
                                        <Typo size={15} fontWeight="600" color={colors.neutral900}>
                                            {user.name}
                                        </Typo>
                                        {user.email && (
                                            <Typo size={12} color={colors.neutral400}>
                                                {user.email}
                                            </Typo>
                                        )}
                                    </View>

                                    {/* Check / Arrow */}
                                    {isGroupMode ? (
                                        <View style={[
                                            styles.checkCircle,
                                            isSelected && styles.checkCircleActive
                                        ]}>
                                            {isSelected && (
                                                <Icons.Check
                                                    size={verticalScale(12)}
                                                    color={colors.black}
                                                    weight="bold"
                                                />
                                            )}
                                        </View>
                                    ) : (
                                        <Icons.CaretRight
                                            size={verticalScale(16)}
                                            color={colors.neutral300}
                                            weight="bold"
                                        />
                                    )}
                                </TouchableOpacity>

                                {/* Divider */}
                                {index < contacts.length - 1 && (
                                    <View style={styles.divider} />
                                )}
                            </Animated.View>
                        );
                    })}
                </ScrollView>

                {/* ── Create Group Footer ── */}
                {isGroupMode && selectedParticipants.length >= 2 && (
                    <Animated.View
                        entering={FadeInUp.duration(400).springify()}
                        style={styles.footer}
                    >
                        <View style={styles.footerMeta}>
                            <Typo size={13} fontWeight="600" color={colors.neutral700}>
                                {selectedParticipants.length} participants selected
                            </Typo>
                            <Typo size={12} color={colors.neutral400}>
                                {!groupName.trim() ? "Add a group name to continue" : "Ready to create!"}
                            </Typo>
                        </View>
                        <Button
                            onPress={createGroup}
                            loading={isLoading}
                            style={[
                                styles.createBtn,
                                !groupName.trim() && { opacity: 0.45 }
                            ] as any}
                        >
                            <Typo fontWeight="700" size={15} color={colors.black}>
                                Create Group
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

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: spacingY._15,
        paddingBottom: spacingY._20,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },

    // Group setup
    groupSetup: {
        alignItems: "center",
        paddingVertical: spacingY._20,
        gap: spacingY._15,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    groupAvatarWrap: {
        position: "relative",
    },
    cameraOverlay: {
        position: "absolute",
        bottom: 2,
        right: 2,
        backgroundColor: colors.white,
        borderRadius: radius.full,
        padding: spacingY._5,
        borderWidth: 1,
        borderColor: colors.neutral200,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    groupNameWrap: {
        width: "100%",
        gap: spacingY._7,
    },
    fieldLabel: {
        letterSpacing: 1.2,
        marginLeft: 4,
    },
    selectedPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacingX._12,
        paddingVertical: spacingY._5,
        borderRadius: radius.full,
    },

    // Section
    sectionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: spacingY._20,
        paddingBottom: spacingY._10,
        paddingHorizontal: 4,
    },
    sectionLabel: {
        letterSpacing: 1.4,
    },

    // Contact list
    contactList: {
        paddingBottom: verticalScale(40),
    },

    // Contact row
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacingY._10,
        paddingHorizontal: spacingX._5,
        borderRadius: radius._12,
        gap: spacingX._12,
    },
    contactRowSelected: {
        backgroundColor: colors.neutral50,
    },
    contactAvatar: {
        // wrapper keeps layout clean
    },
    contactInfo: {
        flex: 1,
        gap: spacingY._5,
    },

    // Checkbox
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

    // Divider
    divider: {
        height: 1,
        backgroundColor: colors.neutral100,
        marginLeft: scale(70),
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        gap: spacingY._12,
        paddingTop: verticalScale(60),
        paddingHorizontal: spacingX._30,
    },
    emptyIconWrap: {
        backgroundColor: colors.neutral100,
        padding: spacingY._20,
        borderRadius: radius._30,
        marginBottom: spacingY._5,
    },

    // Footer
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.neutral100,
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._20,
        gap: spacingY._12,
    },
    footerMeta: {
        gap: spacingY._5,
    },
    createBtn: {
        height: verticalScale(54),
        borderRadius: radius.full,
    },
    createBtnDisabled: {
        opacity: 0.45,
    },
});
