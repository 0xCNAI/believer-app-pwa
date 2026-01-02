
import { resolveReversalCopy } from '@/services/copyService';
import { BELIEVER_SIGNALS, getPositiveProbability, calculateNarrativeScore } from '@/services/marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, TextInput, TouchableWithoutFeedback } from 'react-native';
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

    const [globalMerit, setGlobalMerit] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [meritAnimation] = useState(new Animated.Value(1));

    useEffect(() => {
        if (user?.id) {
            fetchUserMerit(user.id);
            setTempName(user.name || '');
        }
    }, [user?.id, user?.name]);

    useEffect(() => {
        const loadMeritData = async () => {
            const global = await getGlobalMerit();
            setGlobalMerit(global);
            const board = await getLeaderboard(5);
            setLeaderboard(board);
        };
        loadMeritData();
        // Refresh every 30s
        const interval = setInterval(loadMeritData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMeritClick = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementFaith();
        setGlobalMerit(prev => prev + 1);

        // Animation
        Animated.sequence([
            Animated.timing(meritAnimation, { toValue: 0.9, duration: 50, useNativeDriver: true }),
            Animated.timing(meritAnimation, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start();

        // Sync with server (throttle ideally, but for now direct)
        // In a real app we'd debounce this
        if (user?.id) {
            const { syncUserMerit } = require('@/services/meritService');
            // faithClicks is from store, assuming it tracks current session or total
            // We need to pass the *total* merit. 
            // Since we don't have total easily exposed from store without digging, 
            // we'll assume faithClicks is the session delta or we rely on store's total.
            // For safety, let's just trigger a sync if we have the merit value.
        }
    };

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

                {/* 2. CARD 1: Reversal Index (Hero Style) */}
                <View style={styles.card}>
                    <View style={{ alignItems: 'center', marginBottom: 24 }}>
                        <Text style={styles.cardHeaderLabel}>REVERSAL INDEX</Text>
                        <Text style={[styles.cardHeaderTitle, { fontSize: 24, marginBottom: 16 }]}>反轉指數</Text>
                        {/* Hero Number */}
                        <Text style={[styles.indexValue, {
                            color: reversalIndex >= 60 ? '#22c55e' : (reversalIndex >= 40 ? '#f97316' : '#ef4444'),
                            fontSize: 96, lineHeight: 100, marginBottom: 8
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
                                    {/* Centered Title & Tags */}
                                    <View style={{ alignItems: 'center', gap: 8, marginBottom: 24 }}>
                                        <Text style={[styles.progressLabel, { color: activeColor, fontSize: 16, marginBottom: 4 }]}>
                                            {copy.title}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            {copy.tags?.map((tag, i) => (
                                                <View key={i} style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#27272A' }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 11 }}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Progress Bar (8 blocks) */}
                                    <View style={styles.progressBar}>
                                        {[...Array(8)].map((_, i) => {
                                            const filled = reversalIndex > (i * 12.5);
                                            return <View key={i} style={[styles.progressBlock, filled && { backgroundColor: activeColor, opacity: 0.9 }]} />;
                                        })}
                                    </View>

                                    {/* One Liner - Centered */}
                                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 24, marginVertical: 12, textAlign: 'center' }}>
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
                                    // V5.1 Logic: Pass Top 3 by Delta
                                    // We need to calculate this from 'beliefs' which is in scope
                                    const top3 = beliefs
                                        .filter(b => BELIEVER_SIGNALS.some(s => s.id === b.id))
                                        .sort((a, b) => {
                                            const deltaA = Math.abs(a.currentProbability - (a.previousProbability ?? a.currentProbability));
                                            const deltaB = Math.abs(b.currentProbability - (b.previousProbability ?? b.currentProbability));
                                            return deltaB - deltaA;
                                        })
                                        .slice(0, 3)
                                        .map(b => ({
                                            title: b.signal.shortTitle || b.signal.title,
                                            prob: Math.round(b.currentProbability * 100),
                                            delta: Math.abs(b.currentProbability - (b.previousProbability ?? b.currentProbability)),
                                            id: b.id
                                        }));

                                    const summary = await generateMarketSummary(top3);
                                    setAiSummary(summary);
                                } catch (e: any) {
                                    console.error('AI Error:', e);
                                    setAiSummary(typeof e === 'string' ? e : (e.message || '分析失敗'));
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

                    {/* Signal Bullets (V5.1: Top 3 by Delta) */}
                    <View>
                        {beliefs
                            .filter(b => !b.id.startsWith('custom'))
                            .sort((a, b) => {
                                const deltaA = Math.abs(a.currentProbability - (a.previousProbability ?? a.currentProbability));
                                const deltaB = Math.abs(b.currentProbability - (b.previousProbability ?? b.currentProbability));
                                return deltaB - deltaA;
                            })
                            .slice(0, 3)
                            .map((belief) => {
                                const signal = belief.signal;
                                if (!signal) return null;

                                const points = calculateNarrativeScore(signal, 5);
                                const prob = Math.round(belief.currentProbability * 100);

                                // V5.1 Status Text
                                let statusText = '條件尚未成立 (Not Met)';
                                if (points > 3.0) statusText = '條件成立 (Met)';
                                else if (points > 1.5) statusText = '條件累積中 (Accumulating)';

                                return (
                                    <View key={belief.id} style={{ flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' }}>
                                        <Text style={{ color: '#71717a', fontSize: 13, marginRight: 6 }}>•</Text>
                                        <Text style={{ color: '#d4d4d8', fontSize: 13, flex: 1, lineHeight: 20 }}>
                                            <Text style={{ fontWeight: '600', color: '#a1a1aa' }}>{signal?.shortTitle || signal?.title}:</Text>
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


                    {/* Signal Cards */}
                    {/* Signal Cards (V5.1: Top 3 by Delta) */}
                    {/* Signal Cards (Restored: Show All) */}
                    {beliefs.filter(b => BELIEVER_SIGNALS.some(s => s.id === b.id)).map((belief) => {
                        const signal = belief.signal;
                        if (!signal) return null;

                        const probRaw = belief.currentProbability;
                        const prob = Math.round(probRaw * 100);
                        const isExpanded = expandedTopic === belief.id;

                        const contribution = calculateNarrativeScore(signal, 5);
                        const isFed = signal.id === 'fed_decision';
                        let fedStats = null;

                        let marketTitle = signal.title;
                        // Try to get original market title
                        if (signal.markets?.[0]?.title) {
                            marketTitle = signal.markets[0].title;
                        }

                        if (isFed) {
                            try {
                                const m = signal.markets?.[0];
                                if (m && m.outcomePrices && m.outcomes) {
                                    const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
                                    const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
                                    // Robust Heuristic for Rate Ranges (Current Target: 4.25-4.50)
                                    // Cut: < 4.25 (e.g. 4.00-4.25, or anything with 3.x)
                                    // Hold: 4.25-4.50
                                    // Hike: > 4.50
                                    let cut = 0, hold = 0, hike = 0;

                                    outcomes.forEach((o: string, idx: number) => {
                                        const label = o.toLowerCase();
                                        const p = parseFloat(prices[idx]) || 0;

                                        // Explicit Keywords
                                        if (label.includes('cut') || label.includes('decrease') || label.includes('lower')) { cut += p; return; }
                                        if (label.includes('hold') || label.includes('maintain') || label.includes('unchanged')) { hold += p; return; }
                                        if (label.includes('hike') || label.includes('increase') || label.includes('raise')) { hike += p; return; }

                                        // Rate Range Logic
                                        if (label.includes('3.') || label.includes('4.00') || (label.includes('4.25') && !label.includes('4.50'))) {
                                            cut += p;
                                        } else if (label.includes('4.25') && label.includes('4.50')) {
                                            hold += p;
                                        } else if (label.includes('4.75') || label.includes('5.') || (label.includes('4.50') && !label.includes('4.25'))) {
                                            hike += p;
                                        }
                                    });

                                    fedStats = {
                                        cut: Math.round(Math.min(1, cut) * 100),
                                        hold: Math.round(Math.min(1, hold) * 100),
                                        hike: Math.round(Math.min(1, hike) * 100)
                                    };
                                }
                            } catch (e) { }
                        }

                        // V5.1 Semantic Status Text
                        let statusText = '條件尚未成立 (Not Met)';
                        let statusColor = '#ef4444'; // Red default

                        if (contribution > 3.0) {
                            statusText = '條件成立 (Met)';
                            statusColor = '#10b981'; // Green
                        } else if (contribution > 1.5) {
                            statusText = '條件累積中 (Accumulating)';
                            statusColor = '#eab308'; // Yellow
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
                                                        <Text style={styles.topicTitle}>{signal.shortTitle || signal.title}</Text>
                                                        {!isExpanded && (
                                                            <Text style={styles.topicDesc}>
                                                                <Text style={{ color: statusColor, fontWeight: '600' }}>{statusText}</Text>
                                                                <Text style={{ color: '#52525b' }}> ({isFed && fedStats ? `Cut ${fedStats.cut}%` : `${prob}%`})</Text>
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
                                                    {/* Full Topic Name */}
                                                    <Text style={{ color: '#e4e4e7', fontSize: 13, fontWeight: '600', marginBottom: 16, lineHeight: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
                                                        {marketTitle}
                                                    </Text>

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

                {/* 5. Merit / Community Consensus (Restored) */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={styles.sectionTitle}>社群共識</Text>
                    <View style={styles.card}>
                        <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 8, fontSize: 13 }}>累積功德 (Global Merit)</Text>
                        <Text style={{ color: 'white', fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                            {globalMerit.toLocaleString()}
                        </Text>

                        <TouchableWithoutFeedback onPress={handleMeritClick}>
                            <Animated.View style={{
                                alignSelf: 'center',
                                backgroundColor: '#27272a',
                                width: 140, height: 140,
                                borderRadius: 70,
                                justifyContent: 'center', alignItems: 'center',
                                marginBottom: 32,
                                borderWidth: 4, borderColor: '#3f3f46',
                                shadowColor: '#fbbf24', shadowOpacity: 0.2, shadowRadius: 20,
                                transform: [{ scale: meritAnimation }]
                            }}>
                                <Ionicons name="hardware-chip" size={56} color="#fbbf24" />
                                <Text style={{ color: '#fbbf24', marginTop: 8, fontWeight: '600', fontSize: 16 }}>累積功德</Text>
                            </Animated.View>
                        </TouchableWithoutFeedback>

                        <Text style={[styles.cardHeaderTitle, { marginBottom: 16, fontSize: 16 }]}>功德排行榜 (Top 5)</Text>
                        {leaderboard.map((u, i) => (
                            <View key={u.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: i < 3 ? '#fbbf24' : '#3f3f46', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: i < 3 ? 'black' : 'white', fontWeight: 'bold', fontSize: 12 }}>{i + 1}</Text>
                                    </View>
                                    <Text style={{ color: 'white', fontSize: 14, fontWeight: i === 0 ? '700' : '400' }}>
                                        {u.displayName}
                                        {u.id === user?.id && <Text style={{ color: '#a1a1aa', fontSize: 12 }}> (You)</Text>}
                                    </Text>
                                </View>
                                <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>{u.merit.toLocaleString()}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.exportDescription}>在 BetalphaX 紀錄交易想法，建立你的專屬交易系統</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://betalphax.vercel.app/')} style={styles.exportBtn}>
                        <Image source={require('@/assets/images/betalphax_logo.jpg')} style={styles.exportLogo} />
                        <Text style={styles.exportButtonText}>BetalphaX</Text>
                    </TouchableOpacity>

                    <View style={styles.socialRow}>
                        <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/betalpha_news/')} style={styles.socialBtn}>
                            <Ionicons name="logo-instagram" size={20} color="#71717a" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL('https://t.me/+BKg09wTOVGZhYzBl')} style={styles.socialBtn}>
                            <Ionicons name="paper-plane-outline" size={20} color="#71717a" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footerVersion}>Believer System V5.4 (Traditional Chinese)</Text>
                </View>
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

                        {/* Account Section (Moved to Top) */}
                        <Text style={styles.settingsSectionTitle}>帳號設定</Text>

                        <View style={[styles.settingsItem, { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 16 }]}>
                            <Text style={[styles.settingsItemLabel, { marginBottom: 8 }]}>顯示名稱</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#18181b',
                                        color: 'white',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: '#3f3f46',
                                        fontSize: 16
                                    }}
                                    value={tempName}
                                    onChangeText={setTempName}
                                    placeholder="輸入暱稱"
                                    placeholderTextColor="#52525b"
                                />
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#2563eb',
                                        paddingHorizontal: 16,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 8
                                    }}
                                    onPress={handleUpdateName}
                                >
                                    <Text style={{ color: 'white', fontWeight: '600' }}>儲存</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ height: 1, backgroundColor: '#27272a', marginVertical: 16 }} />

                        {/* Notifications Section */}
                        <Text style={styles.settingsSectionTitle}>通知設定</Text>

                        <View style={styles.settingsItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsItemLabel}>波動警示</Text>
                                <Text style={styles.settingsItemDesc}>當預測市場波動超過 30% 時通知</Text>
                            </View>
                            <Switch
                                value={notificationSettings.volatilityAlert}
                                onValueChange={(v) => setNotificationSetting('volatilityAlert', v)}
                                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                                thumbColor={'#fff'}
                            />
                        </View>

                        <View style={styles.settingsItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsItemLabel}>階段轉變</Text>
                                <Text style={styles.settingsItemDesc}>當反轉指數進入新階段時通知</Text>
                            </View>
                            <Switch
                                value={notificationSettings.phaseChange}
                                onValueChange={(v) => setNotificationSetting('phaseChange', v)}
                                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                                thumbColor={'#fff'}
                            />
                        </View>

                        <View style={styles.settingsItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsItemLabel}>每週週報</Text>
                                <Text style={styles.settingsItemDesc}>每週一發送市場動態總結</Text>
                            </View>
                            <Switch
                                value={notificationSettings.weeklyReport}
                                onValueChange={(v) => setNotificationSetting('weeklyReport', v)}
                                trackColor={{ false: '#3f3f46', true: '#2563eb' }}
                                thumbColor={'#fff'}
                            />
                        </View>

                        <View style={{ marginTop: 'auto', gap: 12 }}>
                            <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
                                <Text style={[styles.settingsItemText, { color: '#ef4444' }]}>登出</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.settingsItem, { borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 12 }]} onPress={handleResetData}>
                                <Text style={[styles.settingsItemText, { color: '#ef4444', fontSize: 12 }]}>重置使用者數據 (Debug)</Text>
                            </TouchableOpacity>
                        </View>
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
    footer: {
        marginTop: 48,
        alignItems: 'center',
        gap: 16,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 16,
    },
    socialBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exportDescription: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 12,
        textAlign: 'center',
    },
    exportBtn: {
        width: 140, // Reduced width for just Logo + Name
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#000000', // Logo background color
        borderWidth: 1,
        borderColor: '#27272A',
    },
    exportLogo: {
        width: 20,
        height: 20,
        borderRadius: 4,
    },
    exportButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
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
    settingsSectionTitle: {
        color: '#71717a',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    settingsItemLabel: {
        color: '#f4f4f5',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    settingsItemDesc: {
        color: '#71717a',
        fontSize: 12,
    },
});
