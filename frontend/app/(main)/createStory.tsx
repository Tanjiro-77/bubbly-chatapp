import React, { useState } from 'react';
import {
    View, StyleSheet, TouchableOpacity, TextInput,
    Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { colors, radius, spacingX, spacingY } from '../../constants/theme';
import { verticalScale } from '../../utils/styling';
import Typo from '../../components/Typo';
import Loading from '../../components/Loading';
import { createStory } from '../../socket/socketEvents';
import { uploadFileToCloudinary } from '../../services/imageService';
import { ResponseProps } from '../../types';

const BG_COLORS = [
    '#1c1917', '#1e3a5f', '#14532d', '#7c1d1d',
    '#4a1d96', '#1e40af', '#065f46', '#92400e',
    '#831843', '#134e4a',
];

const CreateStory = () => {
    const router = useRouter();
    const [storyType, setStoryType] = useState<'text' | 'image'>('text');
    const [text, setText] = useState('');
    const [bgColor, setBgColor] = useState(BG_COLORS[0]);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setStoryType('image');
        }
    };

    const handleCreate = async () => {
        if (storyType === 'text' && !text.trim()) {
            Alert.alert('Error', 'Please enter some text');
            return;
        }
        if (storyType === 'image' && !imageUri) {
            Alert.alert('Error', 'Please select an image');
            return;
        }

        setLoading(true);
        try {
            let mediaUrl = '';

            if (storyType === 'image' && imageUri) {
                const uploadResult = await uploadFileToCloudinary(
                    { uri: imageUri },
                    'stories'
                );
                if (!uploadResult.success) {
                    Alert.alert('Error', 'Could not upload image');
                    setLoading(false);
                    return;
                }
                mediaUrl = uploadResult.data;
            }

            createStory({
                type: storyType,
                text: text.trim(),
                backgroundColor: bgColor,
                mediaUrl,
            });

            router.back();
        } catch (error) {
            Alert.alert('Error', 'Could not create story');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                >
                    <Icons.X size={22} color={colors.neutral700} weight="bold" />
                </TouchableOpacity>
                <Typo size={17} fontWeight="700" color={colors.neutral800}>
                    Create Story
                </Typo>
                <TouchableOpacity
                    style={styles.shareBtn}
                    onPress={handleCreate}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading ? (
                        <Loading size="small" color={colors.black} />
                    ) : (
                        <Typo size={14} fontWeight="700" color={colors.black}>
                            Share
                        </Typo>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Type Toggle ── */}
                <View style={styles.typeToggle}>
                    <TouchableOpacity
                        style={[styles.typeBtn, storyType === 'text' && styles.typeBtnActive]}
                        onPress={() => setStoryType('text')}
                        activeOpacity={0.7}
                    >
                        <Icons.TextT
                            size={18}
                            color={storyType === 'text' ? colors.black : colors.neutral500}
                            weight="bold"
                        />
                        <Typo
                            size={13}
                            fontWeight="600"
                            color={storyType === 'text' ? colors.black : colors.neutral500}
                        >
                            Text
                        </Typo>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, storyType === 'image' && styles.typeBtnActive]}
                        onPress={pickImage}
                        activeOpacity={0.7}
                    >
                        <Icons.Image
                            size={18}
                            color={storyType === 'image' ? colors.black : colors.neutral500}
                            weight="bold"
                        />
                        <Typo
                            size={13}
                            fontWeight="600"
                            color={storyType === 'image' ? colors.black : colors.neutral500}
                        >
                            Image
                        </Typo>
                    </TouchableOpacity>
                </View>

                {/* ── Preview ── */}
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={[
                        styles.preview,
                        { backgroundColor: bgColor },
                    ]}
                >
                    {storyType === 'image' && imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                        />
                    ) : null}

                    {storyType === 'text' ? (
                        <TextInput
                            style={styles.textInput}
                            placeholder="What's on your mind?"
                            placeholderTextColor={'rgba(255,255,255,0.4)'}
                            value={text}
                            onChangeText={setText}
                            multiline
                            maxLength={200}
                        />
                    ) : (
                        !imageUri && (
                            <TouchableOpacity
                                style={styles.addImageBtn}
                                onPress={pickImage}
                                activeOpacity={0.8}
                            >
                                <Icons.Plus size={32} color={colors.white} weight="bold" />
                                <Typo size={14} color={colors.white} fontWeight="600">
                                    Add Image
                                </Typo>
                            </TouchableOpacity>
                        )
                    )}
                </Animated.View>

                {/* ── Add text on image ── */}
                {storyType === 'image' && imageUri && (
                    <View style={styles.captionWrap}>
                        <TextInput
                            style={styles.captionInput}
                            placeholder="Add a caption..."
                            placeholderTextColor={colors.neutral400}
                            value={text}
                            onChangeText={setText}
                            maxLength={200}
                        />
                    </View>
                )}

                {/* ── Background Colors (text story only) ── */}
                {storyType === 'text' && (
                    <View style={styles.colorsSection}>
                        <Typo size={13} fontWeight="600" color={colors.neutral600}>
                            Background
                        </Typo>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.colorsList}
                        >
                            {BG_COLORS.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorDot,
                                        { backgroundColor: color },
                                        bgColor === color && styles.colorDotActive,
                                    ]}
                                    onPress={() => setBgColor(color)}
                                    activeOpacity={0.8}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ── Change image button ── */}
                {storyType === 'image' && imageUri && (
                    <TouchableOpacity
                        style={styles.changeImageBtn}
                        onPress={pickImage}
                        activeOpacity={0.8}
                    >
                        <Icons.ArrowsClockwise size={16} color={colors.neutral600} weight="bold" />
                        <Typo size={13} fontWeight="600" color={colors.neutral600}>
                            Change Image
                        </Typo>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default CreateStory;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacingX._20,
        paddingTop: verticalScale(55),
        paddingBottom: spacingY._15,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    closeBtn: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius.full,
        backgroundColor: colors.neutral100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareBtn: {
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._10,
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        minWidth: verticalScale(70),
        alignItems: 'center',
    },
    scrollContent: {
        padding: spacingX._20,
        gap: spacingY._20,
        paddingBottom: verticalScale(40),
    },
    typeToggle: {
        flexDirection: 'row',
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
        padding: 4,
        gap: 4,
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacingX._7,
        paddingVertical: spacingY._10,
        borderRadius: radius.full,
    },
    typeBtnActive: {
        backgroundColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    preview: {
        height: verticalScale(380),
        borderRadius: radius._20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: spacingX._20,
    },
    textInput: {
        width: '100%',
        textAlign: 'center',
        lineHeight: verticalScale(32),
        color: colors.white,
        fontSize: verticalScale(22),
        fontWeight: '700',
    },
    addImageBtn: {
        alignItems: 'center',
        gap: spacingY._10,
    },
    captionWrap: {
        backgroundColor: colors.neutral50,
        borderRadius: radius._12,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._12,
        borderWidth: 1,
        borderColor: colors.neutral200,
    },
    captionInput: {
        fontSize: verticalScale(14),
        color: colors.neutral800,
    },
    colorsSection: {
        gap: spacingY._10,
    },
    colorsList: {
        gap: spacingX._10,
        paddingVertical: spacingY._5,
    },
    colorDot: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius.full,
    },
    colorDotActive: {
        borderWidth: 3,
        borderColor: colors.primary,
        transform: [{ scale: 1.15 }],
    },
    changeImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        alignSelf: 'center',
        paddingHorizontal: spacingX._20,
        paddingVertical: spacingY._10,
        backgroundColor: colors.neutral100,
        borderRadius: radius.full,
    },
});