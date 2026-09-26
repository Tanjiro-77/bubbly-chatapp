import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, Dimensions,
    TextInput, KeyboardAvoidingView, Platform, Alert,
    FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue, useAnimatedStyle,
    withTiming, runOnJS, FadeIn, FadeOut,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { colors, radius, spacingX, spacingY } from '../../constants/theme';
import { verticalScale } from '../../utils/styling';
import Typo from '../../components/Typo';
import Avatar from '../../components/Avatar';
import { useAuth } from '../../contexts/authContext';
import {
    viewStory, reactToStory, deleteStory,
    replyToStory, getStories,
} from '../../socket/socketEvents';
import { StoryGroupProps, StoryItemProps, ResponseProps } from '../../types';
import moment from 'moment';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const StoryViewer = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { groupIndex: groupIndexParam, storiesData } = useLocalSearchParams();

    const allGroups: StoryGroupProps[] = JSON.parse(storiesData as string);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(
        parseInt(groupIndexParam as string) || 0
    );
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showViewers, setShowViewers] = useState(false);

    const progress = useSharedValue(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startTimeRef = useRef<number>(0);
    const elapsedRef = useRef<number>(0);

    const currentGroup = allGroups[currentGroupIndex];
    const currentStory = currentGroup?.stories[currentStoryIndex];
    const isMyStory = currentStory && currentUser?.id === currentGroup.user.id;

    // ─────────────────────────────────────────────
    // PROGRESS & TIMER
    // ─────────────────────────────────────────────
    const startProgress = useCallback((fromElapsed = 0) => {
        const remaining = STORY_DURATION - fromElapsed;
        startTimeRef.current = Date.now();
        elapsedRef.current = fromElapsed;

        progress.value = fromElapsed / STORY_DURATION;
        progress.value = withTiming(1, { duration: remaining }, (finished) => {
            if (finished) {
                runOnJS(goToNext)();
            }
        });

        timerRef.current = setTimeout(() => {
            goToNext();
        }, remaining);
    }, [currentGroupIndex, currentStoryIndex]);

    const pauseProgress = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const elapsed = Date.now() - startTimeRef.current + elapsedRef.current;
        elapsedRef.current = elapsed;
        cancelAnimation(progress);
        setIsPaused(true);
    };

    const resumeProgress = () => {
        setIsPaused(false);
        startProgress(elapsedRef.current);
    };

    useEffect(() => {
        if (!currentStory) return;
        elapsedRef.current = 0;
        progress.value = 0;
        startProgress(0);

        // ── Mark as viewed ──
        viewStory({ storyId: currentStory._id });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [currentGroupIndex, currentStoryIndex]);

    // ─────────────────────────────────────────────
    // NAVIGATION
    // ─────────────────────────────────────────────
    const goToNext = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const group = allGroups[currentGroupIndex];
        if (!group) { router.back(); return; }

        if (currentStoryIndex < group.stories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else if (currentGroupIndex < allGroups.length - 1) {
            setCurrentGroupIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
        } else {
            router.back();
        }
    }, [currentGroupIndex, currentStoryIndex, allGroups]);

    const goToPrev = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        } else if (currentGroupIndex > 0) {
            setCurrentGroupIndex(prev => prev - 1);
            setCurrentStoryIndex(allGroups[currentGroupIndex - 1].stories.length - 1);
        }
    }, [currentGroupIndex, currentStoryIndex, allGroups]);

    // ─────────────────────────────────────────────
    // PROGRESS BAR STYLE
    // ─────────────────────────────────────────────
    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    // ─────────────────────────────────────────────
    // REPLY
    // ─────────────────────────────────────────────
    const handleReply = () => {
        if (!replyText.trim()) return;
        replyToStory({
            storyId: currentStory._id,
            content: replyText.trim(),
        });
        setReplyText('');
        setShowReplyInput(false);
        Alert.alert('✅', 'Reply sent!');
    };

    // ─────────────────────────────────────────────
    // REACT
    // ─────────────────────────────────────────────
    const handleReact = (emoji: string) => {
        reactToStory({
            storyId: currentStory._id,
            emoji,
        });
        setShowEmojiPicker(false);
    };

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────
    const handleDelete = () => {
        Alert.alert(
            'Delete Story',
            'Are you sure you want to delete this story?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteStory({ storyId: currentStory._id });
                        router.back();
                    },
                },
            ]
        );
    };

    if (!currentGroup || !currentStory) {
        router.back();
        return null;
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* ── Background ── */}
            {currentStory.type === 'image' ? (
                <Image
                    source={{ uri: currentStory.mediaUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                />
            ) : (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: currentStory.backgroundColor || '#1c1917' }
                    ]}
                />
            )}

            {/* ── Dark overlay ── */}
            <View style={styles.overlay} />

            {/* ── Progress Bars ── */}
            <View style={styles.progressContainer}>
                {currentGroup.stories.map((_, idx) => (
                    <View key={idx} style={styles.progressTrack}>
                        {idx < currentStoryIndex ? (
                            <View style={[styles.progressFill, { width: '100%' }]} />
                        ) : idx === currentStoryIndex ? (
                            <Animated.View style={[styles.progressFill, progressStyle]} />
                        ) : null}
                    </View>
                ))}
            </View>

            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Avatar size={38} uri={currentGroup.user.avatar} />
                    <View>
                        <Typo size={14} fontWeight="700" color={colors.white}>
                            {currentGroup.user.name}
                        </Typo>
                        <Typo size={11} color={'rgba(255,255,255,0.6)'}>
                            {moment(currentStory.createdAt).fromNow()}
                        </Typo>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    {isMyStory && (
                        <TouchableOpacity
                            style={styles.headerBtn}
                            onPress={handleDelete}
                            activeOpacity={0.7}
                        >
                            <Icons.Trash size={20} color={colors.white} weight="fill" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Icons.X size={22} color={colors.white} weight="bold" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Story Content (text story) ── */}
            {currentStory.type === 'text' && currentStory.text && (
                <View style={styles.textContent}>
                    <Typo
                        size={28}
                        fontWeight="700"
                        color={colors.white}
                        style={styles.storyText}
                    >
                        {currentStory.text}
                    </Typo>
                </View>
            )}

            {/* ── Tap zones ── */}
            <View style={styles.tapZones}>
                <TouchableOpacity
                    style={styles.tapLeft}
                    onPress={goToPrev}
                    onLongPress={() => {
                        pauseProgress();
                        setIsPaused(true);
                    }}
                    onPressOut={() => {
                        if (isPaused) resumeProgress();
                    }}
                    activeOpacity={1}
                />
                <TouchableOpacity
                    style={styles.tapRight}
                    onPress={goToNext}
                    onLongPress={() => {
                        pauseProgress();
                        setIsPaused(true);
                    }}
                    onPressOut={() => {
                        if (isPaused) resumeProgress();
                    }}
                    activeOpacity={1}
                />
            </View>

            {/* ── Bottom Bar ── */}
            <View style={styles.bottomBar}>
                {isMyStory ? (
                    // ── My story: show views ──
                    <TouchableOpacity
                        style={styles.viewersBtn}
                        onPress={() => {
                            pauseProgress();
                            setShowViewers(true);
                        }}
                        activeOpacity={0.8}
                    >
                        <Icons.Eye size={18} color={colors.white} weight="fill" />
                        <Typo size={14} color={colors.white} fontWeight="600">
                            {currentStory.viewers.length} viewers
                        </Typo>
                    </TouchableOpacity>
                ) : (
                    // ── Others story: reply + react ──
                    <View style={styles.replyRow}>
                        {/* ── Emoji reactions ── */}
                        {showEmojiPicker && (
                            <Animated.View
                                entering={FadeIn.duration(200)}
                                exiting={FadeOut.duration(150)}
                                style={styles.emojiPicker}
                            >
                                {EMOJIS.map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        onPress={() => handleReact(emoji)}
                                        style={styles.emojiBtn}
                                        activeOpacity={0.7}
                                    >
                                        <Typo size={26}>{emoji}</Typo>
                                    </TouchableOpacity>
                                ))}
                            </Animated.View>
                        )}

                        <TouchableOpacity
                            style={styles.emojiToggle}
                            onPress={() => {
                                setShowEmojiPicker(prev => !prev);
                                if (!showEmojiPicker) pauseProgress();
                                else resumeProgress();
                            }}
                            activeOpacity={0.8}
                        >
                            <Typo size={24}>😊</Typo>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.replyInput}
                            onPress={() => {
                                pauseProgress();
                                setShowReplyInput(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <Typo size={14} color={'rgba(255,255,255,0.6)'}>
                                Reply to {currentGroup.user.name}...
                            </Typo>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ── Reply Input Modal ── */}
            {showReplyInput && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.replyModal}
                >
                    <View style={styles.replyInputRow}>
                        <TextInput
                            style={styles.replyTextInput}
                            placeholder="Type a reply..."
                            placeholderTextColor={'rgba(255,255,255,0.5)'}
                            value={replyText}
                            onChangeText={setReplyText}
                            autoFocus
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={styles.replySendBtn}
                            onPress={handleReply}
                            activeOpacity={0.8}
                        >
                            <Icons.PaperPlaneTilt
                                size={20}
                                color={colors.black}
                                weight="fill"
                            />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            setShowReplyInput(false);
                            resumeProgress();
                        }}
                        style={styles.cancelReply}
                    >
                        <Typo size={13} color={'rgba(255,255,255,0.7)'}>Cancel</Typo>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ── Viewers Modal ── */}
            {showViewers && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.viewersModal}
                >
                    <View style={styles.viewersHeader}>
                        <Typo size={16} fontWeight="700" color={colors.neutral800}>
                            Viewers ({currentStory.viewers.length})
                        </Typo>
                        <TouchableOpacity
                            onPress={() => {
                                setShowViewers(false);
                                resumeProgress();
                            }}
                        >
                            <Icons.X size={20} color={colors.neutral600} weight="bold" />
                        </TouchableOpacity>
                    </View>
                    {currentStory.viewers.length === 0 ? (
                        <View style={styles.noViewers}>
                            <Typo size={14} color={colors.neutral400}>No viewers yet</Typo>
                        </View>
                    ) : (
                        <FlatList
                            data={currentStory.viewers}
                            keyExtractor={(item, idx) => idx.toString()}
                            renderItem={({ item }) => (
                                <View style={styles.viewerItem}>
                                    <Icons.Eye size={16} color={colors.neutral400} />
                                    <Typo size={13} color={colors.neutral600}>
                                        {moment(item.viewedAt).fromNow()}
                                    </Typo>
                                </View>
                            )}
                        />
                    )}
                </Animated.View>
            )}
        </KeyboardAvoidingView>
    );
};

export default StoryViewer;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.black,
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    // ── Progress ──
    progressContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacingX._10,
        paddingTop: verticalScale(55),
        gap: 4,
        zIndex: 10,
    },
    progressTrack: {
        flex: 1,
        height: 2.5,
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.white,
        borderRadius: 2,
    },
    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._12,
        zIndex: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._5,
    },
    headerBtn: {
        padding: spacingX._7,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: radius.full,
    },
    // ── Text Story Content ──
    textContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacingX._30,
        zIndex: 5,
    },
    storyText: {
        textAlign: 'center',
        lineHeight: 38,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    // ── Tap Zones ──
    tapZones: {
        ...StyleSheet.absoluteFill,
        flexDirection: 'row',
        zIndex: 4,
    },
    tapLeft: {
        flex: 1,
    },
    tapRight: {
        flex: 2,
    },
    // ── Bottom Bar ──
    bottomBar: {
        paddingHorizontal: spacingX._15,
        paddingBottom: verticalScale(40),
        paddingTop: spacingY._15,
        zIndex: 10,
    },
    viewersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._7,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._10,
        borderRadius: radius.full,
    },
    replyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
    },
    emojiToggle: {
        width: verticalScale(44),
        height: verticalScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: radius.full,
    },
    replyInput: {
        flex: 1,
        height: verticalScale(44),
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: spacingX._15,
        justifyContent: 'center',
    },
    // ── Emoji Picker ──
    emojiPicker: {
        position: 'absolute',
        bottom: verticalScale(60),
        left: 0,
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: radius._20,
        padding: spacingX._10,
        gap: spacingX._5,
        zIndex: 20,
    },
    emojiBtn: {
        padding: spacingX._5,
    },
    // ── Reply Modal ──
    replyModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        padding: spacingX._20,
        paddingBottom: verticalScale(40),
        gap: spacingY._12,
        zIndex: 20,
    },
    replyInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: radius._20,
        paddingHorizontal: spacingX._15,
        paddingVertical: spacingY._10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    replyTextInput: {
        flex: 1,
        fontSize: verticalScale(14),
        maxHeight: verticalScale(100),
        color: colors.white,
    },
    replySendBtn: {
        width: verticalScale(36),
        height: verticalScale(36),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelReply: {
        alignSelf: 'center',
    },
    // ── Viewers Modal ──
    viewersModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._30,
        borderTopRightRadius: radius._30,
        padding: spacingX._20,
        paddingBottom: verticalScale(40),
        maxHeight: SCREEN_HEIGHT * 0.5,
        zIndex: 20,
    },
    viewersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacingY._15,
    },
    viewerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacingX._10,
        paddingVertical: spacingY._10,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral100,
    },
    noViewers: {
        alignItems: 'center',
        paddingVertical: spacingY._30,
    },
});