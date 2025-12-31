
import { resolveReversalCopy } from '@/services/copyService';
import { BELIEVER_SIGNALS, getPositiveProbability, calculateNarrativeScore } from '@/services/marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getGlobalMerit, getLeaderboard } from '@/services/meritService';

export default function DashboardScreen() {
    const router = useRouter();
    const { getReversalIndex, getInterpretation, btcPrice, setBtcPrice, beliefs, faithClicks, incrementFaith } = useBeliefStore();
    const reversalIndex = getReversalIndex();
    const interpretation = getInterpretation();
    const [refreshing, setRefreshing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [btc24hChange, setBtc24hChange] = useState<number | null>(null);
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

    // Settings & Notifications State
    const {
        notificationSettings,
        setNotificationSetting,
        resetProfile,
    } = useUserStore();

    // Auth & Profile
    const { user, logout, updateProfile } = useAuthStore();
    const { fetchUserMerit } = useBeliefStore();
    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    useEffect(() => {
        if (user?.id) {
            fetchUserMerit(user.id);
        }
    }, [user?.id]);

    const handleUpdateName = async () => {
        if (!tempName.trim()) return;
        try {
            await updateProfile(tempName);
            setEditingName(false);
        } catch (e) {
            alert('Failed to update name');
        }
    };

    // Wooden Fish Animation State
    const [showMerit, setShowMerit] = useState(false);
    const [showMeritModal, setShowMeritModal] = useState(false);
    const [showEmailDev, setShowEmailDev] = useState(false);
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const stickAnim = useRef(new Animated.Value(0)).current;

    const handleFishClick = () => {
        incrementFaith();
        const triggerHaptic = () => {
            if (Platform.OS === 'web') {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10);
                }
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
            }
        };

        Animated.sequence([
            Animated.timing(stickAnim, {
                toValue: 1,
                duration: 100,
                // useNativeDriver: Platform.OS !== 'web', // Buggy on some web
                useNativeDriver: false,
                easing: Easing.in(Easing.quad),
            }),
            Animated.parallel([
                Animated.timing(stickAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: false,
                    easing: Easing.out(Easing.quad),
                }),
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 0.9,
                        duration: 50,
                        useNativeDriver: false,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: false,
                        easing: Easing.elastic(1.5),
                    })
                ])
            ])
        ]).start();

        setTimeout(triggerHaptic, 100);
        setShowMerit(true);
        setTimeout(() => setShowMerit(false), 500);
    };

    console.log('[Dashboard] Rendering. Index:', reversalIndex);

    useEffect(() => {
        console.log('[Dashboard] Mount: Fetching BTC Price & refreshing TechStore...');
        try {
            require('@/stores/techStore').useTechStore.getState().fetchAndEvaluate();
        } catch (e) {
            console.error('[Dashboard] Failed to trigger techStore update:', e);
        }

        const fetchBtcPrice = async () => {
            try {
                const response = await fetch('/api/coingecko');
                const data = await response.json();
                if (data.bitcoin?.usd) {
                    setBtcPrice(data.bitcoin.usd);
                    setBtc24hChange(data.bitcoin.usd_24h_change);
                }
            } catch (error) {
                console.log('BTC price fetch error:', error);
            }
        };
        fetchBtcPrice();

        try {
            useBeliefStore.getState().refreshBeliefs();
        } catch (e) { }

        const interval = setInterval(fetchBtcPrice, 60000);
        return () => clearInterval(interval);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        console.log('[Dashboard] Manual Refresh Triggered');
        require('@/stores/techStore').useTechStore.getState().fetchAndEvaluate();
        setTimeout(() => setRefreshing(false), 1500);
    };

    const roundedPrice = btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 });

    const handleLogout = async () => {
        setShowSettings(false);
        await require('@/stores/authStore').useAuthStore.getState().logout();
        router.replace('/login');
    };

    const handleResetData = async () => {
        setShowSettings(false);
        require('@/stores/userStore').useUserStore.getState().resetProfile();
        require('@/stores/onboardingStore').useOnboardingStore.getState().resetOnboarding();
        router.replace('/onboarding');
    };

    // V5.3 UI Helper: Narrative Progress Bar
    const renderNarrativeProgressBar = () => {
        // Calculate Total Narrative Score
        const totalScore = beliefs.reduce((sum, b) => {
            const points = b.signal ? calculateNarrativeScore(b.signal, 5) : 0;
            return sum + points;
        }, 0);

        const maxScore = 25;
        const percent = Math.min(100, (totalScore / maxScore) * 100);

        // Define Stages
        // 0-8 (0-32%): Risk Dominant
        // 8-15 (32-60%): Accumulation
        // 15-22 (60-88%): Brewing
        // 22-25 (88-100%): Confirmed

        let currentStage = 'Risk Dominant';
        let stageColor = '#ef4444';

        if (totalScore >= 22) { currentStage = 'Confirmed'; stageColor = '#22c55e'; }
        else if (totalScore >= 15) { currentStage = 'Brewing'; stageColor = '#eab308'; }
        else if (totalScore >= 8) { currentStage = 'Accumulation'; stageColor = '#f97316'; }

        return (
            <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
                        Reversal Conditions
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: stageColor, fontSize: 12, fontWeight: 'bold' }}>{currentStage}</Text>
                        <Text style={{ color: '#52525b', fontSize: 12 }}>{totalScore.toFixed(1)} / 25.0</Text>
                    </View>
                </View>

                {/* Progress Track */}
                <View style={{ height: 6, backgroundColor: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: stageColor,
                        borderRadius: 3
                    }} />
                </View>

                {/* Segment Markers (Optional) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>Risk</Text>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>Accum</Text>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>Brewing</Text>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>Confirmed</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerBrand}>Believer V5.3</Text>
                </View>
                <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.notificationBtn}>
                    <View style={styles.notificationIconWrapper}>
                        <Ionicons name="notifications-outline" size={20} color="white" />
                        <View style={styles.notificationBadge} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={[styles.notificationBtn, { marginLeft: 8, borderColor: '#3f3f46' }]}>
                    <Ionicons name="settings-outline" size={18} color="#71717a" />
                </TouchableOpacity>
            </View >

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
                {/* BTC Price Header */}
                <View style={styles.marketAnchor}>
                    <Text style={styles.anchorValue}>BTC ${roundedPrice}</Text>
                    {btc24hChange !== null && (
                        <Text style={[styles.btcChange, { color: btc24hChange >= 0 ? '#22c55e' : '#ef4444' }]}>
                            {btc24hChange >= 0 ? '+' : ''}{btc24hChange.toFixed(2)}% (24h)
                        </Text>
                    )}
                </View>

                {/* SECTION 1: MARKET DYNAMICS (AI + State) */}
                <View style={[styles.card, { marginBottom: 24 }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardHeaderLabel}>Market Dynamics</Text>
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 4,
                                backgroundColor: '#27272a', paddingHorizontal: 8, paddingVertical: 4,
                                borderRadius: 12, borderWidth: 1, borderColor: '#3f3f46'
                            }}
                            onPress={async () => {
                                if (loadingAi) return;
                                setLoadingAi(true);
                                setAiSummary(null);
                                try {
                                    const { generateMarketSummary } = require('@/services/aiService');
                                    const summary = await generateMarketSummary();
                                    setAiSummary(summary);
                                } catch (e) {
                                    setAiSummary('Analysis failed.');
                                } finally {
                                    setLoadingAi(false);
                                }
                            }}
                        >
                            <Ionicons name="sparkles" size={12} color="#fbbf24" />
                            <Text style={{ color: '#e4e4e7', fontSize: 10, fontWeight: '600' }}>AI Summary</Text>
                        </TouchableOpacity>
                    </View>

                    {/* AI Summary Display */}
                    {(loadingAi || aiSummary) && (
                        <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                            {loadingAi ? (
                                <Text style={{ color: '#fbbf24', fontSize: 13 }}>Analyzing Google Search News...</Text>
                            ) : (
                                <Text style={{ color: '#fbbf24', fontSize: 13, lineHeight: 20 }}>
                                    {aiSummary}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Dynamic Bullets (Based on Signals) */}
                    <View>
                        {beliefs.filter(b => !b.id.startsWith('custom')).slice(0, 3).map((belief) => {
                            const signal = belief.signal;
                            const points = signal ? calculateNarrativeScore(signal, 5) : 0;
                            const prob = Math.round(belief.currentProbability * 100);

                            let statusText = 'Neutral';
                            if (points > 3) statusText = 'Strong Support';
                            else if (points > 1.5) statusText = 'Building';
                            else statusText = 'Weak';

                            return (
                                <View key={belief.id} style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' }}>
                                    <Text style={{ color: '#71717a', fontSize: 13, marginRight: 6 }}>•</Text>
                                    <Text style={{ color: '#d4d4d8', fontSize: 13, flex: 1, lineHeight: 20 }}>
                                        <Text style={{ fontWeight: '600', color: '#a1a1aa' }}>{signal?.title.split(' ')[0]}:</Text>
                                        {' '}{statusText} ({prob}%)
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                </View>

                {/* SECTION 2: MARKET EXPECTATIONS (Progress + Cards) */}
                <View>
                    <Text style={styles.sectionTitle}>Market Expectations</Text>

                    {/* Narrative Progress Bar */}
                    {renderNarrativeProgressBar()}

                    {/* Signal Cards */}
                    {beliefs.filter(b => BELIEVER_SIGNALS.some(s => s.id === b.id)).map((belief) => {
                        const signal = belief.signal;
                        if (!signal) return null;

                        const probRaw = belief.currentProbability;
                        const prob = Math.round(probRaw * 100);
                        const isExpanded = expandedTopic === belief.id;

                        // V5.3 Contribution Score
                        const contribution = calculateNarrativeScore(signal, 5);

                        // Fed Special Logic
                        const isFed = signal.id === 'fed_decision';
                        let fedStats = null;
                        if (isFed) {
                            try {
                                const m = signal.markets?.[0];
                                if (m && m.outcomePrices && m.outcomes) {
                                    const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
                                    const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;

                                    const sumByKeyword = (kw: string[]) => {
                                        let sum = 0;
                                        outcomes.forEach((o: string, idx: number) => {
                                            const lower = o.toLowerCase();
                                            if (kw.some(k => lower.includes(k))) sum += parseFloat(prices[idx]) || 0;
                                        });
                                        return Math.round(Math.min(1, sum) * 100);
                                    };
                                    fedStats = {
                                        cut: sumByKeyword(['decrease', 'cut', 'lower']),
                                        hold: sumByKeyword(['no change', 'unchanged', 'maintain']),
                                        hike: sumByKeyword(['increase', 'hike', 'raise'])
                                    };
                                }
                            } catch (e) { }
                        }

                        return (
                            <TouchableOpacity
                                key={belief.id}
                                style={[styles.topicCard, isExpanded && styles.topicCardExpanded]}
                                onPress={() => setExpandedTopic(isExpanded ? null : belief.id)}
                                activeOpacity={0.7}
                            >
                                {/* Helper Function for Fed Bar */}
                                {(() => {
                                    const renderFedBar = (label: string, val: number, color: string) => (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={{ width: 40, color: '#a1a1aa', fontSize: 12 }}>{label}</Text>
                                            <View style={{ flex: 1, height: 8, backgroundColor: '#27272a', borderRadius: 4, marginRight: 8, overflow: 'hidden' }}>
                                                <View style={{ width: `${val}%`, height: '100%', backgroundColor: color }} />
                                            </View>
                                            <Text style={{ width: 35, color: '#e4e4e7', fontSize: 12, textAlign: 'right' }}>{val}%</Text>
                                        </View>
                                    );

                                    return (
                                        <>
                                            {/* HEADER (Collapsed) */}
                                            <View style={styles.topicHeader}>
                                                <View style={styles.topicLeft}>
                                                    {/* Status Dot (Neutral Color) */}
                                                    <View style={[styles.topicDot, { backgroundColor: '#52525b' }]} />
                                                    <View style={styles.topicInfo}>
                                                        <Text style={styles.topicTitle}>{signal.title}</Text>
                                                        {!isExpanded && (
                                                            <Text style={styles.topicDesc}>
                                                                {isFed && fedStats ? `Cut ${fedStats.cut}% / Hold ${fedStats.hold}%` : `Probability: ${prob}%`}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <View style={styles.topicRight}>
                                                    <Text style={[styles.topicProb, { color: '#e4e4e7' }]}>
                                                        {isFed && fedStats ? `${fedStats.cut}%` : `${prob}%`}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* EXPANDED CONTENT */}
                                            {isExpanded && (
                                                <View style={{ marginTop: 16 }}>
                                                    {/* 1. Contribution Score */}
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#27272a', padding: 8, borderRadius: 6 }}>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 12 }}>Narrative Contribution</Text>
                                                        <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                                                            +{contribution.toFixed(2)} / 5.00 pts
                                                        </Text>
                                                    </View>

                                                    {/* 2. Outcome Distribution (Fed Special vs Standard) */}
                                                    <View style={{ marginBottom: 16 }}>
                                                        <Text style={{ color: '#71717a', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>Outcome Distribution</Text>

                                                        {isFed && fedStats ? (
                                                            // FED UI
                                                            <View>
                                                                {renderFedBar('Cut', fedStats.cut, '#22c55e')}
                                                                {renderFedBar('Hold', fedStats.hold, '#f59e0b')}
                                                                {renderFedBar('Hike', fedStats.hike, '#ef4444')}
                                                            </View>
                                                        ) : (
                                                            // STANDARD UI
                                                            <View>
                                                                {renderFedBar('Yes', prob, '#22c55e')}
                                                                {renderFedBar('No', 100 - prob, '#71717a')}
                                                            </View>
                                                        )}
                                                    </View>

                                                    {/* 3. Link */}
                                                    <TouchableOpacity
                                                        style={styles.viewMarketBtn}
                                                        onPress={() => {
                                                            const slug = signal.source.slug;
                                                            if (typeof window !== 'undefined' && slug) {
                                                                window.open(`https://polymarket.com/event/${slug}`, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.viewMarketText}>View on Polymarket</Text>
                                                        <Ionicons name="open-outline" size={14} color="#a1a1aa" />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Footer */}
                <Text style={styles.footerVersion}>Believer System V5.3</Text>
            </ScrollView>

            {/* Notification Panel Overlay */}
            {
                showNotifications && (
                    <View style={styles.notificationOverlay}>
                        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowNotifications(false)} />
                        <View style={styles.drawerPanel}>
                            <Text style={styles.drawerTitle}>通知中心</Text>
                            <View style={styles.notificationItem}>
                                <View style={styles.notifHeader}>
                                    <View style={[styles.dotSmall, { backgroundColor: '#3b82f6' }]} />
                                    <Text style={styles.notifType}>SYSTEM</Text>
                                </View>
                                <Text style={styles.notifContent}>UI Update 5.3: Narrative Progress bar added.</Text>
                                <Text style={styles.notifTime}>Just now</Text>
                            </View>
                        </View>
                    </View>
                )
            }

            {/* Settings Dropdown */}
            {showSettings && (
                <>
                    <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} activeOpacity={1} onPress={() => setShowSettings(false)} />
                    <View style={styles.settingsOverlay}>
                        <View style={[styles.settingsItem, { borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 16, marginBottom: 8 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#71717a', fontSize: 10, marginBottom: 4 }}>DISPLAY NAME</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{user?.name || 'Believer'}</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
                            <Text style={[styles.settingsItemText, { color: '#ef4444' }]}>登出</Text>
                            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.settingsItem, { borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 12 }]} onPress={handleResetData}>
                            <Text style={[styles.settingsItemText, { color: '#ef4444', fontSize: 12 }]}>重置使用者數據 (Debug)</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
    },
    headerBrand: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f4f4f5',
        letterSpacing: 0.5,
    },
    notificationBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272a',
        marginLeft: 'auto',
    },
    notificationIconWrapper: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -1,
        right: 0,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ef4444',
    },
    marketAnchor: {
        marginTop: 24,
        marginBottom: 24,
    },
    anchorValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    btcChange: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 24,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    cardHeaderLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A1A1AA',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    cardHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    indexMeter: {
        marginBottom: 24,
        alignItems: 'flex-start',
    },
    indexValue: {
        fontSize: 56,
        fontWeight: '800',
        letterSpacing: -2,
        lineHeight: 60,
    },
    progressSection: {
        marginTop: 8,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    progressBar: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        gap: 2,
        marginBottom: 16,
    },
    progressBlock: {
        flex: 1,
        backgroundColor: '#27272A',
    },
    progressContext: {
        marginTop: 8,
    },
    contextTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA',
        marginBottom: 8,
    },
    contextItem: {
        fontSize: 14,
        color: '#D4D4D8',
        marginBottom: 6,
        lineHeight: 20,
    },
    dynamicsBox: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
    },
    dynamicsLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A1A1AA',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dynamicItem: {
        marginBottom: 12,
    },
    dynamicChange: {
        fontSize: 14,
        color: '#E4E4E7',
        fontWeight: '600',
        marginBottom: 4,
    },
    dynamicInterpret: {
        fontSize: 13,
        color: '#A1A1AA',
    },
    dynamicImpact: {
        fontSize: 13,
        color: '#71717A',
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 16,
    },
    topicCard: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272a',
        padding: 16,
        marginBottom: 12,
    },
    topicCardExpanded: {
        borderColor: '#3f3f46',
        backgroundColor: '#18181b',
    },
    topicHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topicLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        gap: 12,
    },
    topicDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
    },
    topicInfo: {
        flex: 1,
    },
    topicTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f4f4f5',
        marginBottom: 4,
    },
    topicDesc: {
        fontSize: 13,
        color: '#a1a1aa',
        lineHeight: 18,
    },
    topicRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginLeft: 12,
    },
    topicProb: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fbbf24',
    },
    topicSource: {
        fontSize: 10,
        color: '#52525b',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    topicDetails: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#27272a',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 11,
        color: '#71717a',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 14,
        color: '#e4e4e7',
        fontWeight: '500',
    },
    outcomesContainer: {
        marginBottom: 16,
    },
    outcomeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    outcomeText: {
        fontSize: 13,
        color: '#d4d4d8',
    },
    outcomeProb: {
        fontSize: 13,
        color: '#fbbf24',
        fontWeight: '600',
    },
    viewMarketBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: '#27272a',
        borderRadius: 8,
    },
    viewMarketText: {
        fontSize: 12,
        color: '#e4e4e7',
        fontWeight: '500',
    },
    expandedContent: {
        // Animation container
    },
    footerVersion: {
        marginTop: 32,
        fontSize: 12,
        color: '#3f3f46',
        textAlign: 'center',
    },
    notificationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    drawerPanel: {
        backgroundColor: '#18181b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        minHeight: 300,
    },
    drawerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 24,
    },
    notificationItem: {
        marginBottom: 24,
    },
    notifHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    notifType: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#a1a1aa',
    },
    notifContent: {
        fontSize: 14,
        color: '#e4e4e7',
        marginBottom: 4,
        lineHeight: 20,
    },
    notifTime: {
        fontSize: 12,
        color: '#71717a',
    },
    settingsOverlay: {
        position: 'absolute',
        top: 60,
        right: 24,
        width: 220,
        backgroundColor: '#18181b',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3f3f46',
        padding: 8,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    settingsItemText: {
        fontSize: 13,
        color: '#e4e4e7',
        fontWeight: '500',
    },
});
