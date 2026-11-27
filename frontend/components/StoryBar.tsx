import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Icons from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacingX, spacingY } from '../constants/theme';
import { verticalScale, scale } from '../utils/styling';
import { hapticTap } from '../utils/haptics';
import Typo from './Typo';
import Avatar from './Avatar';
import { useAuth } from '../contexts/authContext';
import {
    getStories, onStoryFeedUpdated, onSocketConnectionChange,
} from '../socket/socketEvents';
import { getCachedStories, getMemoryStories, setActiveStorySession, setCachedStories } from '../utils/chatCache';
import { StoryGroupProps, ResponseProps } from '../types';

const StoryBar = () => {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [storyGroups, setStoryGroups] = useState<StoryGroupProps[]>(
        () => getMemoryStories(currentUser?.id) ?? []
    );

    const fetchStories = useCallback(() => {
        getStories(null);
    }, []);

    useEffect(() => {
        if (currentUser?.id) {
            getCachedStories(currentUser.id).then((cached) => {
                if (cached.length > 0) {
                    setStoryGroups((prev) => (prev.length === 0 ? cached : prev));
                }
            }).catch(() => {});
        }
    }, [currentUser?.id]);

    useEffect(() => {
        const storiesHandler = (res: ResponseProps) => {
            if (res.success && Array.isArray(res.data)) {
                setStoryGroups(res.data);
                setCachedStories(currentUser?.id, res.data);
            }
        };

        const feedUpdatedHandler = () => {
            fetchStories();
        };

        getStories(storiesHandler);
        onStoryFeedUpdated(feedUpdatedHandler);
        const unsubConn = onSocketConnectionChange((connected) => {
            if (connected) fetchStories();
        });
        fetchStories();

        return () => {
            getStories(storiesHandler, true);
            onStoryFeedUpdated(feedUpdatedHandler, true);
            unsubConn();
        };
    }, [currentUser?.id, fetchStories]);

    const openStory = useCallback((groupIndex: number) => {
        hapticTap("medium");
        setActiveStorySession(storyGroups);
        router.push({
            pathname: '/(main)/storyViewer',
            params: {
                groupIndex: String(Math.max(0, groupIndex)),
            },
        });
    }, [router, storyGroups]);

    const { myStoryGroup, myStoryIndex, otherGroups, indexByUserId } = useMemo(() => {
        let myIdx = -1;
        const others: StoryGroupProps[] = [];
        const indexMap = new Map<string, number>();
        storyGroups.forEach((g, idx) => {
            if (!g?.user?.id) return;
            indexMap.set(g.user.id, idx);
            if (g.user.id === currentUser?.id) {
                myIdx = idx;
            } else {
                others.push(g);
            }
        });
        return {
            myStoryGroup: myIdx !== -1 ? storyGroups[myIdx] : undefined,
            myStoryIndex: myIdx,
            otherGroups: others,
            indexByUserId: indexMap,
        };
    }, [storyGroups, currentUser?.id]);

    return (
        <Animated.View entering={FadeIn.duration(220)} style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── My Story / Add Story ── */}
                <TouchableOpacity
                    style={styles.storyWrap}
                    onPress={() => {
                        if (myStoryGroup) {
                            openStory(myStoryIndex);
                        } else {
                            hapticTap("medium");
                            router.push('/(main)/createStory');
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.avatarWrap}>
                        {myStoryGroup ? (
                            <LinearGradient
                                colors={['#f59e0b', '#fbbf24', '#fde047']}
                                style={styles.gradientRing}
                            >
                                <View style={styles.innerRingPad}>
                                    <Avatar size={52} uri={currentUser?.avatar || null} />
                                </View>
                            </LinearGradient>
                        ) : (
                            <View style={styles.myStoryOutline}>
                                <Avatar size={52} uri={currentUser?.avatar || null} />
                            </View>
                        )}

                        {/* Plus badge (separate tap target so users can add multiple stories) */}
                        <TouchableOpacity
                            style={styles.addBtn}
                            onPress={(e) => {
                                e.stopPropagation?.();
                                hapticTap("medium");
                                router.push('/(main)/createStory');
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            activeOpacity={0.85}
                        >
                            <Icons.Plus
                                size={verticalScale(11)}
                                color={colors.neutral900}
                                weight="bold"
                            />
                        </TouchableOpacity>
                    </View>

                    <Typo
                        size={11.5}
                        fontWeight={myStoryGroup ? "700" : "600"}
                        color={myStoryGroup ? colors.neutral900 : colors.neutral600}
                        textProps={{ numberOfLines: 1 }}
                        style={styles.storyName}
                    >
                        {myStoryGroup ? 'Your story' : 'Add story'}
                    </Typo>
                </TouchableOpacity>

                {/* ── Other Stories ── */}
                {otherGroups.map((group) => {
                    if (!group?.user?.id) return null;
                    const realIndex = indexByUserId.get(group.user.id) ?? 0;
                    const firstName = (group.user?.name || 'User').trim().split(' ')[0] || 'User';
                    return (
                        <TouchableOpacity
                            key={group.user.id}
                            style={styles.storyWrap}
                            onPress={() => openStory(realIndex)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.avatarWrap}>
                                {group.hasUnseen ? (
                                    <LinearGradient
                                        colors={['#f59e0b', '#facc15', '#fde047']}
                                        style={styles.gradientRing}
                                    >
                                        <View style={styles.innerRingPad}>
                                            <Avatar size={52} uri={group.user.avatar} />
                                        </View>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.seenRing}>
                                        <Avatar size={52} uri={group.user.avatar} />
                                    </View>
                                )}
                            </View>

                            <Typo
                                size={11.5}
                                fontWeight={group.hasUnseen ? "700" : "500"}
                                color={group.hasUnseen ? colors.neutral900 : colors.neutral500}
                                textProps={{ numberOfLines: 1 }}
                                style={styles.storyName}
                            >
                                {firstName}
                            </Typo>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </Animated.View>
    );
};

export default React.memo(StoryBar);

const styles = StyleSheet.create({
    container: {
        marginBottom: spacingY._8,
    },
    scrollContent: {
        paddingHorizontal: spacingX._20,
        gap: spacingX._12,
        paddingVertical: spacingY._5,
    },
    storyWrap: {
        alignItems: 'center',
        gap: spacingY._5,
        width: scale(66),
    },
    avatarWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    gradientRing: {
        padding: 2.5,
        borderRadius: radius.full,
    },
    innerRingPad: {
        padding: 2,
        borderRadius: radius.full,
        backgroundColor: colors.white,
    },
    myStoryOutline: {
        padding: 3,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.neutral300,
    },
    seenRing: {
        padding: 3,
        borderRadius: radius.full,
        borderWidth: 1.5,
        borderColor: colors.neutral200,
    },
    addBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: verticalScale(20),
        height: verticalScale(20),
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
    },
    storyName: {
        width: "100%",
        textAlign: 'center',
    },
});
