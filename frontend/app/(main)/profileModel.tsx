import {
    Platform, ScrollView, StyleSheet,
    TouchableOpacity, View, Pressable
} from 'react-native'
import React, { useEffect, useState } from 'react'
import { colors, radius, spacingX, spacingY } from "../../constants/theme"
import { scale, verticalScale } from "../../utils/styling"
import ScreenWrapper from "../../components/ScreenWrapper"
import BackButton from "../../components/BackButton"
import Avatar from "../../components/Avatar"
import * as Icons from "phosphor-react-native"
import Typo from "../../components/Typo"
import Input from "../../components/Input"
import { useAuth } from "../../contexts/authContext"
import { UserDataProps } from "../../types"
import Button from "../../components/Button"
import { Alert } from "react-native"
import { useRouter } from "expo-router"
import { updateProfile } from "../../socket/socketEvents"
import * as ImagePicker from 'expo-image-picker'
import { uploadFileToCloudinary } from "../../services/imageService"
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'

const ProfileModal = () => {

    const { user, signOut, updateToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [userData, setUserData] = useState<UserDataProps>({
        name: "",
        email: "",
        avatar: null
    });

    useEffect(() => {
        updateProfile(processUpdateProfile);
        return () => { updateProfile(processUpdateProfile, true); };
    }, []);

    const processUpdateProfile = (res: any) => {
        setLoading(false);
        if (res.success) {
            updateToken(res.data.token);
            router.back();
        } else {
            Alert.alert('User', res.msg);
        }
    };

    useEffect(() => {
        setUserData({
            name: user?.name || "",
            email: user?.email || "",
            avatar: user?.avatar,
        });
    }, [user]);

    const onPickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            aspect: [4, 3],
            quality: 0.5,
        });
        if (!result.canceled) {
            setUserData({ ...userData, avatar: result.assets[0] });
        }
    };

    const handleLogout = async () => {
        router.back();
        await signOut();
    };

    const showLogoutAlert = () => {
        Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: 'cancel' },
            { text: "Sign Out", onPress: handleLogout, style: 'destructive' }
        ]);
    };

    const onSubmit = async () => {
        let { name, avatar } = userData;
        if (!name.trim()) {
            Alert.alert('Profile', "Please enter your name");
            return;
        }
        let data = { name, avatar };
        if (avatar && avatar?.uri) {
            setLoading(true);
            const res = await uploadFileToCloudinary(avatar, "profiles");
            if (res.success) {
                data.avatar = res.data;
            } else {
                Alert.alert("Upload Failed", res.msg);
                setLoading(false);
                return;
            }
        }
        updateProfile(data);
    };

    return (
        <ScreenWrapper isModal={true}>
            <View style={styles.container}>

                {/* ── Header ── */}
                <Animated.View
                    entering={FadeInDown.duration(400).springify()}
                    style={styles.header}
                >
                    {Platform.OS === 'android' ? (
                        <BackButton color={colors.neutral800} iconSize={22} />
                    ) : (
                        <View style={{ width: 22 }} />
                    )}
                    <Typo size={17} fontWeight="700" color={colors.neutral900}>
                        Edit Profile
                    </Typo>
                    <View style={{ width: 22 }} />
                </Animated.View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >

                    {/* ── Avatar ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(100).springify()}
                        style={styles.avatarSection}
                    >
                        <View style={styles.avatarContainer}>
                            <Avatar uri={userData.avatar} size={130} />
                            <TouchableOpacity
                                style={styles.editIcon}
                                onPress={onPickImage}
                                activeOpacity={0.75}
                            >
                                <Icons.Camera
                                    size={verticalScale(18)}
                                    color={colors.neutral700}
                                    weight="bold"
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.userInfo}>
                            <Typo size={20} fontWeight="700" color={colors.neutral900}>
                                {userData.name || "Your Name"}
                            </Typo>
                            <Typo size={13} color={colors.neutral400} fontWeight="400">
                                {userData.email}
                            </Typo>
                        </View>
                    </Animated.View>

                    {/* ── Divider ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(150).springify()}
                        style={styles.divider}
                    />

                    {/* ── Fields ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(200).springify()}
                        style={styles.fields}
                    >

                        <Typo
                            size={11}
                            fontWeight="700"
                            color={colors.neutral400}
                            style={styles.sectionLabel}
                        >
                            ACCOUNT DETAILS
                        </Typo>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Icons.Envelope
                                    size={verticalScale(14)}
                                    color={colors.neutral500}
                                    weight="bold"
                                />
                                <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                    EMAIL ADDRESS
                                </Typo>
                            </View>
                            <Input
                                value={userData.email}
                                editable={false}
                                containerStyle={styles.disabledInput}
                                onChangeText={value =>
                                    setUserData({ ...userData, email: value })
                                }
                            />
                            <Typo size={11} color={colors.neutral400} style={{ marginLeft: 4 }}>
                                Email cannot be changed
                            </Typo>
                        </View>

                        {/* Name */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Icons.User
                                    size={verticalScale(14)}
                                    color={colors.neutral500}
                                    weight="bold"
                                />
                                <Typo size={12} fontWeight="600" color={colors.neutral500} style={styles.label}>
                                    DISPLAY NAME
                                </Typo>
                            </View>
                            <Input
                                value={userData.name}
                                onChangeText={value =>
                                    setUserData({ ...userData, name: value })
                                }
                                placeholder="Enter your name"
                                icon={
                                    <Icons.PencilSimple
                                        size={verticalScale(18)}
                                        color={colors.neutral400}
                                        weight="regular"
                                    />
                                }
                            />
                        </View>

                    </Animated.View>

                    {/* ── Account Actions ── */}
                    <Animated.View
                        entering={FadeInDown.duration(500).delay(250).springify()}
                        style={styles.dangerZone}
                    >
                        <Typo
                            size={11}
                            fontWeight="700"
                            color={colors.neutral400}
                            style={styles.sectionLabel}
                        >
                            ACCOUNT ACTIONS
                        </Typo>


                        {/* ── About Bubbly ── */}
                        <Pressable
                            onPress={() => router.push("/(main)/about")}
                            style={({ pressed }) => [
                                styles.actionRow,
                                pressed && { opacity: 0.6, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={styles.actionIconWrap}>
                                    <Icons.Info
                                        size={verticalScale(18)}
                                        color={colors.primary}
                                        weight="bold"
                                    />
                                </View>
                                <View>
                                    <Typo size={15} fontWeight="600" color={colors.neutral800}>
                                        About Bubbly
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
                                        App info & developer
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* ── How to Use Bubbly (replay) ── */}
                        <Pressable
                            onPress={() => router.push("/onboarding?replay=true")}
                            style={({ pressed }) => [
                                styles.actionRow,
                                pressed && { opacity: 0.6, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={styles.tutorialIconWrap}>
                                    <Icons.BookOpen
                                        size={verticalScale(18)}
                                        color={colors.neutral600}
                                        weight="bold"
                                    />
                                </View>
                                <View>
                                    <Typo size={15} fontWeight="600" color={colors.neutral800}>
                                        How to Use Bubbly
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
                                        Replay the app walkthrough
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* ── Settings ── */}
                        <Pressable
                            onPress={() => router.push("/(main)/settings")}
                            style={({ pressed }) => [
                                styles.actionRow,
                                pressed && { opacity: 0.6, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={styles.tutorialIconWrap}>
                                    <Icons.GearSix
                                        size={verticalScale(18)}
                                        color={colors.neutral600}
                                        weight="bold"
                                    />
                                </View>
                                <View>
                                    <Typo size={15} fontWeight="600" color={colors.neutral800}>
                                        Settings
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
                                        Notifications, privacy & more
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                        {/* ── Sign Out ── */}
                        <Pressable
                            onPress={showLogoutAlert}
                            style={({ pressed }) => [
                                styles.actionRow,
                                pressed && { opacity: 0.6, backgroundColor: colors.neutral100 }
                            ]}
                        >
                            <View style={styles.actionLeft}>
                                <View style={styles.signOutIconWrap}>
                                    <Icons.SignOut
                                        size={verticalScale(18)}
                                        color={colors.rose}
                                        weight="bold"
                                    />
                                </View>
                                <View>
                                    <Typo size={15} fontWeight="600" color={colors.rose}>
                                        Sign Out
                                    </Typo>
                                    <Typo size={12} color={colors.neutral400}>
                                        You'll need to sign in again
                                    </Typo>
                                </View>
                            </View>
                            <Icons.CaretRight
                                size={verticalScale(16)}
                                color={colors.neutral300}
                                weight="bold"
                            />
                        </Pressable>

                    </Animated.View>

                </ScrollView>
            </View>

            {/* ── Footer ── */}
            <Animated.View
                entering={FadeInUp.duration(500).delay(250).springify()}
                style={styles.footer}
            >
                <Button
                    style={styles.updateBtn}
                    onPress={onSubmit}
                    loading={loading}
                >
                    <Typo color={colors.black} fontWeight="700" size={16}>
                        Save Changes
                    </Typo>
                </Button>
            </Animated.View>

        </ScreenWrapper>
    );
};

export default ProfileModal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    tutorialIconWrap: {
        backgroundColor: colors.neutral100,
        padding: spacingY._10,
        borderRadius: radius._12,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacingX._20,
        paddingTop: spacingY._15,
        paddingBottom: spacingY._15,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },

    // Scroll
    scrollContent: {
        paddingBottom: spacingY._30,
        gap: spacingY._30,
    },

    // Avatar section
    avatarSection: {
        alignItems: "center",
        gap: spacingY._15,
        paddingTop: spacingY._30,
        paddingHorizontal: spacingX._20,
    },
    avatarContainer: {
        position: "relative",
    },
    editIcon: {
        position: "absolute",
        bottom: 4,
        right: 4,
        borderRadius: radius.full,
        backgroundColor: colors.white,
        padding: spacingY._7,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    userInfo: {
        alignItems: "center",
        gap: spacingY._5,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: colors.neutral100,
        marginHorizontal: spacingX._20,
    },

    // Fields
    fields: {
        paddingHorizontal: spacingX._20,
        gap: spacingY._20,
    },
    sectionLabel: {
        letterSpacing: 1.4,
        marginLeft: 4,
        marginBottom: spacingY._5,
    },
    fieldGroup: {
        gap: spacingY._7,
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginLeft: 4,
    },
    label: {
        letterSpacing: 1.2,
    },
    disabledInput: {
        backgroundColor: colors.neutral100,
        borderColor: colors.neutral200,
        opacity: 0.65,
    },

    // Account Actions section
    dangerZone: {
        paddingHorizontal: spacingX._20,
        gap: spacingY._10,
    },

    // Shared action row — used by both About and Sign Out
    actionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.neutral50,
        borderRadius: radius._15,
        borderWidth: 1,
        borderColor: colors.neutral200,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._15,
    },
    actionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
    },

    // About icon wrap — primary-tinted background
    actionIconWrap: {
        backgroundColor: "#fefce8",   // very light yellow, matches primary #facc15
        padding: spacingY._10,
        borderRadius: radius._12,
    },

    // Sign out icon wrap — rose-tinted background (unchanged)
    signOutIconWrap: {
        backgroundColor: "#fef2f2",
        padding: spacingY._10,
        borderRadius: radius._12,
    },

    // Footer
    footer: {
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._15,
        borderTopWidth: 1,
        borderTopColor: colors.neutral100,
        marginBottom: spacingY._10,
    },
    updateBtn: {
        height: verticalScale(56),
        borderRadius: radius.full,
    },
});