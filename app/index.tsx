
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
import { useTechStore } from '@/stores/techStore';

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

    // AI State
    const [loadingAi, setLoadingAi] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);

    console.log('[Dashboard] Rendering. Index:', reversalIndex);

    useEffect(() => {
        console.log('[Dashboard] Mount: Fetching BTC Price & refreshing TechStore...');
        try {
            useTechStore.getState().fetchAndEvaluate();
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
        useTechStore.getState().fetchAndEvaluate();
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

    // V5.4 Helper: Narrative Progress Bar (Localized)
    const renderNarrativeProgressBar = () => {
        const totalScore = beliefs.reduce((sum, b) => {
            const points = b.signal ? calculateNarrativeScore(b.signal, 5) : 0;
            return sum + points;
        }, 0);

        const maxScore = 25;
        const percent = Math.min(100, (totalScore / maxScore) * 100);

        // Stages (Localized)
        // 0-8: 風險主導 (Risk Dominant)
        // 8-15: 條件累積 (Accumulation)
        // 15-22: 反轉醞釀 (Brewing)
        // 22-25: 反轉成立 (Confirmed)

        let currentStage = '風險主導';
        let stageColor = '#ef4444';

        if (totalScore >= 22) { currentStage = '反轉成立'; stageColor = '#22c55e'; }
        else if (totalScore >= 15) { currentStage = '反轉醞釀'; stageColor = '#eab308'; }
        else if (totalScore >= 8) { currentStage = '條件累積'; stageColor = '#f97316'; }

        return (
            <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>
                        反轉條件 (Conditions)
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

                {/* Segment Markers */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>風險</Text>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>累積</Text>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>醞釀</Text>
                    <Text style={{ color: '#52525b', fontSize: 10 }}>成立</Text>
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
                    <Text style={styles.headerBrand}>Believer V5.4</Text>
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

                {/* 1. BTC Price Header (Centered) */}
                <View style={styles.marketAnchor}>
                    <Text style={styles.anchorValue}>BTC ${roundedPrice}</Text>
                    {btc24hChange !== null && (
                        <Text style={[styles.btcChange, { color: btc24hChange >= 0 ? '#22c55e' : '#ef4444' }]}>
                            {btc24hChange >= 0 ? '+' : ''}{btc24hChange.toFixed(2)}% (24h)
                        </Text>
                    )}
                </View>

                {/* 2. CARD 1: Reversal Index (Restored Core Metric) */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardHeaderLabel}>Reversal Index</Text>
                            <Text style={styles.cardHeaderTitle}>反轉指數</Text>
                        </View>
                        {/* Big Number */}
                        <Text style={[styles.indexValue, {
                            color: reversalIndex >= 60 ? '#22c55e' : (reversalIndex >= 40 ? '#f97316' : '#ef4444'),
                            fontSize: 32, lineHeight: 36
                        }]}>
                            {reversalIndex.toFixed(0)}
                        </Text>
                    </View>

                    {/* Copy Logic Restored */}
                    {(() => {
                        try {
                            const { reversalState } = useTechStore.getState();
                            const copy = resolveReversalCopy(reversalState || { trendScore: 0, cycleScore: 0 });

                            // Stage Colors
                            const getStageColor = (stage: string) => {
                                switch (stage) {
                                    case 'OVERHEATED': return '#ef4444';
                                    case 'CONFIRMED': return '#22c55e';
                                    case 'PREPARE': return '#eab308';
                                    case 'WATCH': return '#f97316';
                                    default: return '#71717a';
                                }
                            };
                            const activeColor = getStageColor(copy.displayStage);

                            return (
                                <View style={styles.progressSection}>
                                    {/* Title & Tags */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <Text style={[styles.progressLabel, { color: activeColor, marginBottom: 0 }]}>
                                            {copy.title}
                                        </Text>
                                        {copy.tags?.map((tag, i) => (
                                            <View key={i} style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#27272A' }}>
                                                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>{tag}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Progress Bar (8 blocks) */}
                                    <View style={styles.progressBar}>
                                        {[...Array(8)].map((_, i) => {
                                            const filled = reversalIndex > (i * 12.5);
                                            return <View key={i} style={[styles.progressBlock, filled && { backgroundColor: activeColor, opacity: 0.9 }]} />;
                                        })}
                                    </View>

                                    {/* One Liner */}
                                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 22, marginVertical: 8 }}>
                                        {copy.oneLiner}
                                    </Text>

                                    {/* Context */}
                                    <View style={styles.progressContext}>
                                        <Text style={styles.contextTitle}>目前的依據</Text>
                                        {copy.reasonLines.map((line, i) => <Text key={i} style={styles.contextItem}>• {line}</Text>)}

                                        <Text style={[styles.contextTitle, { color: activeColor, marginTop: 12 }]}>下一步</Text>
                                        {copy.next.map((line, i) => <Text key={i} style={styles.contextItem}>👉 {line}</Text>)}
                                    </View>
                                </View>
                            );
                        } catch (e) { return null; }
                    })()}
                </View>

                {/* 3. CARD 2: Market Dynamics (AI) */}
                <View style={[styles.card, { paddingVertical: 20 }]}>
                    <View style={[styles.cardHeader, { marginBottom: 16 }]}>
                        <Text style={styles.cardHeaderTitle}>市場動態</Text>
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
                                    setAiSummary('分析失敗，請檢查 API 設定。');
                                } finally {
                                    setLoadingAi(false);
                                }
                            }}
                        >
                            <Ionicons name="sparkles" size={12} color="#fbbf24" />
                            <Text style={{ color: '#e4e4e7', fontSize: 11, fontWeight: '600' }}>AI 智能分析</Text>
                        </TouchableOpacity>
                    </View>

                    {/* AI Content */}
                    {(loadingAi || aiSummary) && (
                        <View style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                            {loadingAi ? (
                                <Text style={{ color: '#fbbf24', fontSize: 13 }}>正在搜尋並分析最新新聞...</Text>
                            ) : (
                                <Text style={{ color: '#fbbf24', fontSize: 13, lineHeight: 20 }}>
                                    {aiSummary}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Signal Bullets */}
                    <View>
                        {beliefs.filter(b => !b.id.startsWith('custom')).slice(0, 3).map((belief) => {
                            const signal = belief.signal;
                            const points = signal ? calculateNarrativeScore(signal, 5) : 0;
                            const prob = Math.round(belief.currentProbability * 100);

                            let statusText = '中性 (Neutral)';
                            if (points > 3) statusText = '強力支撐 (Strong)';
                            else if (points > 1.5) statusText = '累積中 (Building)';
                            else statusText = '疲弱 (Weak)';

                            return (
                                <View key={belief.id} style={{ flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' }}>
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

                {/* 4. SECTION: Market Expectations */}
                <View>
                    <Text style={styles.sectionTitle}>市場預期</Text>

                    {/* Narrative Progress Bar */}
                    {renderNarrativeProgressBar()}

                    {/* Signal Cards */}
                    {beliefs.filter(b => BELIEVER_SIGNALS.some(s => s.id === b.id)).map((belief) => {
                        const signal = belief.signal;
                        if (!signal) return null;

                        const probRaw = belief.currentProbability;
                        const prob = Math.round(probRaw * 100);
                        const isExpanded = expandedTopic === belief.id;

                        const contribution = calculateNarrativeScore(signal, 5);
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
                                {(() => {
                                    const renderBar = (label: string, val: number, color: string) => (
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
                                            <View style={styles.topicHeader}>
                                                <View style={styles.topicLeft}>
                                                    <View style={[styles.topicDot, { backgroundColor: '#52525b' }]} />
                                                    <View style={styles.topicInfo}>
                                                        <Text style={styles.topicTitle}>{signal.title}</Text>
                                                        {!isExpanded && (
                                                            <Text style={styles.topicDesc}>
                                                                {isFed && fedStats ? `Cut ${fedStats.cut}% / Hold ${fedStats.hold}%` : `機率: ${prob}%`}
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

                                            {isExpanded && (
                                                <View style={{ marginTop: 16 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#27272a', padding: 8, borderRadius: 6 }}>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 12 }}>敘事貢獻 (Score)</Text>
                                                        <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                                                            +{contribution.toFixed(2)} / 5.00 pts
                                                        </Text>
                                                    </View>

                                                    <View style={{ marginBottom: 16 }}>
                                                        <Text style={{ color: '#71717a', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>結果分佈 (Outcomes)</Text>
                                                        {isFed && fedStats ? (
                                                            <View>
                                                                {renderBar('Cut', fedStats.cut, '#22c55e')}
                                                                {renderBar('Hold', fedStats.hold, '#f59e0b')}
                                                                {renderBar('Hike', fedStats.hike, '#ef4444')}
                                                            </View>
                                                        ) : (
                                                            <View>
                                                                {renderBar('Yes', prob, '#22c55e')}
                                                                {renderBar('No', 100 - prob, '#71717a')}
                                                            </View>
                                                        )}
                                                    </View>

                                                    <TouchableOpacity
                                                        style={styles.viewMarketBtn}
                                                        onPress={() => {
                                                            const slug = signal.source.slug;
                                                            if (typeof window !== 'undefined' && slug) {
                                                                window.open(`https://polymarket.com/event/${slug}`, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.viewMarketText}>前往 Polymarket 查看</Text>
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
                <Text style={styles.footerVersion}>Believer System V5.4 (Traditional Chinese)</Text>
            </ScrollView>

            {/* Notification Panel */}
            {showNotifications && (
                <View style={styles.notificationOverlay}>
                    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowNotifications(false)} />
                    <View style={styles.drawerPanel}>
                        <Text style={styles.drawerTitle}>通知中心</Text>
                        <View style={styles.notificationItem}>
                            <View style={styles.notifHeader}>
                                <View style={[styles.dotSmall, { backgroundColor: '#3b82f6' }]} />
                                <Text style={styles.notifType}>SYSTEM</Text>
                            </View>
                            <Text style={styles.notifContent}>UI V5.4 全中文化版本已上線。</Text>
                            <Text style={styles.notifTime}>Just now</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Settings */}
            {showSettings && (
                <>
                    <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} activeOpacity={1} onPress={() => setShowSettings(false)} />
                    <View style={styles.settingsOverlay}>
                        <View style={[styles.settingsItem, { borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 16, marginBottom: 8 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#71717a', fontSize: 10, marginBottom: 4 }}>顯示名稱</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{user?.name || 'Believer'}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
                            <Text style={[styles.settingsItemText, { color: '#ef4444' }]}>登出</Text>
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
        alignItems: 'center', // Centered BTC
    },
    anchorValue: {
        fontSize: 36,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: -1,
    },
    btcChange: {
        fontSize: 15,
        marginTop: 4,
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 24,
        marginBottom: 24,
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
    indexValue: {
        fontWeight: '800',
        letterSpacing: -1,
    },
    progressSection: {
        marginTop: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    progressBar: {
        flexDirection: 'row',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        gap: 3,
        marginBottom: 16,
    },
    progressBlock: {
        flex: 1,
        backgroundColor: '#27272A',
        borderRadius: 2,
    },
    progressContext: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
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
        marginBottom: 8,
        lineHeight: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 16,
        marginTop: 8,
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
        width: 200,
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
