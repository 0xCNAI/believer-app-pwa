import { resolveReversalCopy } from '@/services/copyService';
import { useNotificationStore, NotificationItem } from '@/stores/notificationStore'; // Import Notification Store
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
import { Animated, Easing, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, TextInput, TouchableWithoutFeedback, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getGlobalMerit, getLeaderboard, getUserRank, syncUserMerit } from '@/services/meritService';
import { useTechStore } from '@/stores/techStore';
import { useAIStore } from '@/stores/aiStore';
import { useMarketInsights, MarketInsight } from '@/hooks/useMarketInsights';

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
    const [expandedTechItem, setExpandedTechItem] = useState<string | null>(null);
    const [showScoreInfo, setShowScoreInfo] = useState(false);

    // Market Insights (Firebase)
    const { loading: marketInsightsLoading, lastUpdated: marketInsightsLastUpdated, getAllInsights } = useMarketInsights();
    const allMarketInsights: MarketInsight[] = getAllInsights();

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

    // Restored State for Merit Modal
    const [globalMerit, setGlobalMerit] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userRank, setUserRank] = useState(0);
    const [meritTab, setMeritTab] = useState<'mine' | 'leaderboard'>('mine');

    // Floating Merit State
    const [scaleAnim] = useState(new Animated.Value(1));
    const [plusOneAnim] = useState(new Animated.Value(0)); // 0 to 1 for opacity/translate
    const [showMerit, setShowMerit] = useState(false);
    const [showMeritModal, setShowMeritModal] = useState(false);

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
            const board = await getLeaderboard(50);
            setLeaderboard(board);
            if (user?.id) {
                const rank = await getUserRank(faithClicks);
                setUserRank(rank);
            }
        };
        loadMeritData();
        // Refresh every 30s
        const interval = setInterval(loadMeritData, 30000);
        return () => clearInterval(interval);
    }, [user?.id, faithClicks, refreshing]);

    const handleMeritClick = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        incrementFaith();
        setGlobalMerit(prev => prev + 1);
        setShowMerit(true);
        // Reset and start +1 animation
        plusOneAnim.setValue(0);
        Animated.timing(plusOneAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
        }).start(() => setShowMerit(false));

        // Stick Animation
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 50, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start();

        // Sync logic
        if (user?.id) {
            // Use imported service directly
            // Simplified sync for demo - actual sync handled by store debounce
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

        // Refresh global merit data as well
        getGlobalMerit().then(setGlobalMerit);
        getLeaderboard().then(setLeaderboard);

        setTimeout(() => setRefreshing(false), 1500);
    };

    const roundedPrice = btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 });

    const handleLogout = async () => {
        setShowSettings(false);
        await logout(); // Use destructured logout from useAuthStore hook
        router.replace('/login');
    };

    const handleResetData = async () => {
        setShowSettings(false);
        await resetProfile(); // Use destructured resetProfile from useUserStore hook
        useOnboardingStore.getState().resetOnboarding(); // Use top-level import
        router.replace('/onboarding');
    };



    // V5.1 Auto-Refresh Logic (Post 8 AM)
    useEffect(() => {
        const checkAndRefresh = async () => {
            const { lastEvaluated, fetchAndEvaluate } = useTechStore.getState();
            // Get today's 8:00 AM
            const now = new Date();
            const today8AM = new Date();
            today8AM.setHours(8, 0, 0, 0);

            // If it's currently past 8 AM
            if (now.getTime() > today8AM.getTime()) {
                // And we haven't evaluated since 8 AM (or ever)
                if (!lastEvaluated || lastEvaluated < today8AM.getTime()) {
                    console.log('[AutoRefresh] Triggering daily analysis...');
                    await fetchAndEvaluate(true);
                }
            }
        };
        checkAndRefresh();
    }, []);
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={[styles.cardHeaderTitle, { fontSize: 24, marginRight: 8 }]}>反轉指數</Text>
                            <TouchableOpacity onPress={() => setShowScoreInfo(true)}>
                                <Ionicons name="help-circle-outline" size={20} color="#71717a" />
                            </TouchableOpacity>
                        </View>
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
                            const copy = resolveReversalCopy(reversalState);

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

                                    {/* One Liner - Centered (No Change Hint) */}
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 24, textAlign: 'center' }}>
                                            {copy.oneLiner}
                                        </Text>
                                    </View>

                                    {/* Progress Bar with Cap Label */}
                                    <View style={{ marginBottom: 24 }}>
                                        <View style={styles.progressBar}>
                                            {[...Array(8)].map((_, i) => {
                                                const filled = reversalIndex > (i * 12.5);
                                                return <View key={i} style={[styles.progressBlock, filled && { backgroundColor: activeColor, opacity: 0.9 }]} />;
                                            })}
                                        </View>
                                        {/* Simplified Cap Progress Label */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                                            <Text style={{ color: '#71717a', fontSize: 13 }}>
                                                結構進度: {Math.min(100, Math.round((reversalState.finalScore / reversalState.phaseCap) * 100))}% ({reversalState.phaseCap === 60 ? 'Accumulation' : (reversalState.phaseCap === 75 ? 'Transition' : 'Expansion')})
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Tech Analysis Status (Enhanced) */}
                                    <View style={styles.progressContext}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={styles.contextTitle}>技術分析狀態</Text>
                                                {/* Timestamp */}
                                                <Text style={{ color: '#52525b', fontSize: 12 }}>
                                                    {useTechStore.getState().lastEvaluated
                                                        ? new Date(useTechStore.getState().lastEvaluated).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                                                        : '--/-- --:--'}
                                                </Text>
                                            </View>

                                            {/* Refresh Button */}
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    await useTechStore.getState().fetchAndEvaluate(true);
                                                }}
                                                style={{ padding: 4 }}
                                            >
                                                <Ionicons name="refresh" size={16} color="#71717a" />
                                            </TouchableOpacity>
                                        </View>

                                        {(() => {
                                            const { conditions } = useTechStore.getState();
                                            // Sort: Passed Gates -> Passed Boosters -> Failed Gates
                                            // Priority score: 
                                            // Passed Gate = 3
                                            // Passed Booster = 2
                                            // Failed Gate = 1
                                            // Failed Booster = 0
                                            const sorted = [...conditions].sort((a, b) => {
                                                const scoreA = (a.passed ? 2 : 0) + (a.group === 'Gate' ? 1 : 0);
                                                const scoreB = (b.passed ? 2 : 0) + (b.group === 'Gate' ? 1 : 0);
                                                return scoreB - scoreA;
                                            });

                                            const top3 = sorted.slice(0, 3);

                                            if (top3.length === 0) {
                                                return <Text style={{ color: '#71717a', fontSize: 13 }}>尚無分析數據</Text>;
                                            }

                                            return top3.map((c) => {
                                                const isExpanded = expandedTechItem === c.id;

                                                // Simplified Status Logic (No visual noise)
                                                let statusSuffix = '';
                                                let statusHighlight = false;

                                                // Note: Without historical diffs, we can't accurately tag "New Confirmation".
                                                // For now, we strictly follow the "clean" rule: if passed, show nothing.
                                                // If failed, check if close.

                                                if (!c.passed) {
                                                    statusSuffix = '（接近中）'; // Placeholder for "Approaching"
                                                }

                                                return (
                                                    <TouchableOpacity
                                                        key={c.id}
                                                        onPress={() => setExpandedTechItem(isExpanded ? null : c.id)}
                                                        activeOpacity={0.7}
                                                        style={{ marginBottom: 8 }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                            <Text style={{ color: c.passed ? '#10b981' : '#71717a', fontSize: 13, marginRight: 6, marginTop: 1 }}>
                                                                {c.passed ? '✓' : '•'}
                                                            </Text>
                                                            <View style={{ flex: 1 }}>
                                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                                                    <Text style={{ color: '#d4d4d8', fontWeight: '500', marginRight: 4 }}>
                                                                        {c.nameCN}
                                                                    </Text>

                                                                    {/* Only show suffix if it exists (e.g. approaching) */}
                                                                    <Text style={{ color: statusHighlight ? '#fbbf24' : '#71717a' }}>
                                                                        {isExpanded ? '' : statusSuffix}
                                                                    </Text>
                                                                </View>

                                                                {/* Expanded Content */}
                                                                {isExpanded && (
                                                                    <View style={{ marginTop: 4 }}>
                                                                        <Text style={{ color: '#fbbf24', fontSize: 13, marginBottom: 2 }}>
                                                                            狀態：{c.passed ? (c.detail || '條件成立') : '條件未滿足'} {statusSuffix}
                                                                        </Text>
                                                                        <Text style={{ color: '#71717a', fontSize: 12, lineHeight: 18 }}>
                                                                            {c.descCN || ''}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            });
                                        })()}
                                        activeOpacity={0.7}
                                        style={{ marginBottom: 8 }}
                                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                            <Text style={{ color: c.passed ? '#10b981' : '#71717a', fontSize: 13, marginRight: 6, marginTop: 1 }}>
                                                {c.passed ? '✓' : '•'}
                                            </Text>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                                    <Text style={{ color: '#d4d4d8', fontWeight: '500', marginRight: 4 }}>
                                                        {c.nameCN}
                                                    </Text>
                                                    <Text style={{ color: '#71717a' }}>
                                                        {isExpanded ? '' : `：${c.passed ? (c.detail || '條件成立') : '條件未滿足'}${statusSuffix} `}
                                                    </Text>
                                                </View>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <View style={{ marginTop: 4 }}>
                                                        <Text style={{ color: '#fbbf24', fontSize: 13, marginBottom: 2 }}>
                                                            狀態：{c.passed ? (c.detail || '條件成立') : '條件未滿足'} {statusSuffix}
                                                        </Text>
                                                        <Text style={{ color: '#71717a', fontSize: 12, lineHeight: 18 }}>
                                                            {c.descCN || ''}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                    );
                                            });
                                        })()}

                                    {/* Next Steps (Keep or Remove? User didn't say remove, but space might be tight. I'll keep it) */}
                                    <Text style={[styles.contextTitle, { color: activeColor, marginTop: 12 }]}>下一步</Text>
                                    {copy.next.map((line, i) => <Text key={i} style={styles.contextItem}>👉 {line}</Text>)}
                                </View>
                                </View>
                );
                        } catch (e) { return null; }
                    })()}
            </View>

            {/* Reversal Score Info Modal */}
            <Modal
                visible={showScoreInfo}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowScoreInfo(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowScoreInfo(false)}
                >
                    <View style={{
                        backgroundColor: '#18181b',
                        borderRadius: 16,
                        padding: 24,
                        marginHorizontal: 32,
                        marginTop: 'auto',
                        marginBottom: 'auto',
                        borderWidth: 1,
                        borderColor: '#3f3f46',
                        maxWidth: 340,
                        alignSelf: 'center'
                    }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>反轉指數 (Reversal Index)</Text>
                        <Text style={{ color: '#d4d4d8', fontSize: 14, lineHeight: 22, marginBottom: 24 }}>
                            本指數由三大核心維度組成：
                            {'\n'}
                            1. <Text style={{ color: '#fff', fontWeight: 'bold' }}>技術結構 (Gates)</Text>: 4 大核心過濾條件
                            {'\n'}
                            2. <Text style={{ color: '#fff', fontWeight: 'bold' }}>市場動能 (Boosters)</Text>: 4 大輔助因子
                            {'\n'}
                            3. <Text style={{ color: '#fff', fontWeight: 'bold' }}>敘事權重 (Narrative)</Text>: AI 分析的市場情緒指標
                            {'\n\n'}
                            綜合評估市場是否具備真正的反轉條件。
                            {'\n\n'}
                            • <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>0-20</Text>: 下跌趨勢 (Declining)
                            {'\n'}
                            • <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>20-50</Text>: 觀察區 (Watch)
                            {'\n'}
                            • <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>50-80</Text>: 早期訊號 (Early Signal)
                            {'\n'}
                            • <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>80-100</Text>: 確認反轉 (Confirmed)
                        </Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#27272a', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                            onPress={() => setShowScoreInfo(false)}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>了解</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* 2.5. CARD: Contribution & Leaderboard (Restored) */}


            {/* 3. CARD 2: Market Dynamics (AI) */}
            <View style={[styles.card, { paddingVertical: 20 }]}>
                <View style={[styles.cardHeader, { marginBottom: 16 }]}>
                    <Text style={styles.cardHeaderTitle}>市場動態</Text>
                    {/* Timestamp instead of button */}
                    {marketInsightsLastUpdated && (
                        <Text style={{ color: '#71717a', fontSize: 11 }}>
                            更新於: {new Date(marketInsightsLastUpdated).toLocaleString('zh-TW', {
                                month: 'numeric', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: false
                            })}
                        </Text>
                    )}
                </View>

                {/* Loading State */}
                {marketInsightsLoading && (
                    <View style={{ padding: 12, backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: 8, marginBottom: 16 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 13 }}>正在載入市場動態...</Text>
                    </View>
                )}

                {/* Insights Display */}
                {!marketInsightsLoading && allMarketInsights.length > 0 && (
                    <View>
                        {allMarketInsights.slice(0, 4).map((insight: any, index) => {
                            // Lookup specific signal by ID if provided by AI
                            const matchedBelief = insight.signalId
                                ? beliefs.find(b => b.id === insight.signalId)
                                : null;

                            // Format Probability Title if matched
                            let displayTitle = null;
                            if (matchedBelief) {
                                const prob = Math.round(matchedBelief.currentProbability * 100);
                                displayTitle = `${matchedBelief.signal?.shortTitle || '相關訊號'}機率 (${prob}%)`;
                            }

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={{ marginBottom: 20 }}
                                    onPress={() => {
                                        if (insight.url && typeof window !== 'undefined') {
                                            window.open(insight.url, '_blank');
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Line 1: Signal Title (The "What") */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Text style={{ color: '#fbbf24', fontSize: 13, marginRight: 8 }}>•</Text>

                                        {displayTitle ? (
                                            <Text style={{ color: '#e4e4e7', fontSize: 14, fontWeight: '700' }}>
                                                {displayTitle}
                                            </Text>
                                        ) : (
                                            <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '400' }}>
                                                市場關注事件
                                            </Text>
                                        )}
                                    </View>

                                    {/* Line 2: AI Analysis (The "Why") */}
                                    <View style={{ paddingLeft: 16, marginBottom: 6 }}>
                                        <Text style={{ color: '#d4d4d8', fontSize: 14, lineHeight: 22, fontWeight: '400' }}>
                                            {insight.analysis}
                                        </Text>
                                    </View>

                                    {/* Line 3: Source Headline + Link */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14 }}>
                                        <Text
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                            style={{ color: '#71717a', fontSize: 12, flex: 1, marginRight: 8, textDecorationLine: 'underline' }}
                                        >
                                            {insight.headline}
                                        </Text>
                                        <Ionicons name="open-outline" size={12} color="#71717a" />
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}

                {/* Empty State */}
                {!marketInsightsLoading && allMarketInsights.length === 0 && (
                    <Text style={{ color: '#71717a', fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
                        市場動態分析將每 3 小時自動更新
                    </Text>
                )}
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
                    // Safe check first.
                    if (signal.markets?.[0]?.title) {
                        marketTitle = signal.markets[0].title;
                    }

                    if (isFed) {
                        try {
                            let cut = 0, hold = 0, hike = 0;
                            const markets = signal.markets || [];

                            // Strategy A: Multi-Market Group (New Polymarket Structure)
                            // Each market is a binary Yes/No on a specific outcome (e.g. "25bps decrease")
                            if (markets.length > 1) {
                                markets.forEach((m: any) => {
                                    const title = (m.groupItemTitle || m.title || m.question || '').toLowerCase();

                                    // Parse Price of "Yes" outcome
                                    let price = 0;
                                    try {
                                        const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
                                        price = parseFloat(prices[0] || '0');
                                    } catch (e) { }

                                    if (title.includes('cut') || title.includes('decrease') || title.includes('lower')) {
                                        cut += price;
                                    } else if (title.includes('hold') || title.includes('maintain') || title.includes('unchanged') || title.includes('no change')) {
                                        hold += price;
                                    } else if (title.includes('hike') || title.includes('increase') || title.includes('raise')) {
                                        hike += price;
                                    }
                                });
                            }
                            // Strategy B: Single Market (Legacy or Range-based)
                            else if (markets.length === 1) {
                                const m = markets[0];
                                if (m && m.outcomePrices && m.outcomes) {
                                    const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
                                    const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;

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
                                }
                            }

                            fedStats = {
                                cut: Math.round(Math.min(1, cut) * 100),
                                hold: Math.round(Math.min(1, hold) * 100),
                                hike: Math.round(Math.min(1, hike) * 100)
                            };
                        } catch (e) {
                            console.warn('Fed rate parsing failed:', e);
                        }
                    }

                    // V5.1 Semantic Status Text (Localized)
                    let statusText = '負向機率偏高';
                    let statusColor = '#ef4444'; // Red default

                    if (contribution > 2.5) {
                        statusText = '正向機率偏高';
                        statusColor = '#10b981'; // Green
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
                                    <View style={{ marginBottom: 8 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ color: '#d4d4d8', fontSize: 13 }}>{label}</Text>
                                            <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{val}%</Text>
                                        </View>
                                        <View style={{ height: 8, backgroundColor: '#27272a', borderRadius: 4, overflow: 'hidden' }}>
                                            <View style={{ width: `${val}% `, height: '100%', backgroundColor: color }} />
                                        </View>
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
                                                            <Text style={{ color: '#52525b' }}> ({isFed && fedStats ? `Cut ${fedStats.cut}% ` : `${prob}% `})</Text>
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            <View style={styles.topicRight}>
                                                <Text style={[styles.topicProb, { color: '#e4e4e7' }]}>
                                                    {isFed && fedStats ? `${fedStats.cut}% ` : `${prob}% `}
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
                                                            {renderBar('降息 (正向事件)', fedStats.cut, '#22c55e')}
                                                            {renderBar('維持', fedStats.hold, '#f59e0b')}
                                                            {renderBar('升息 (負向事件)', fedStats.hike, '#ef4444')}
                                                        </View>
                                                    ) : (
                                                        <View>
                                                            {(() => {
                                                                // Determine labels based on scoring type
                                                                const isBinaryBad = signal.scoring === 'binary_bad';
                                                                const yesLabel = isBinaryBad ? '是 (負向事件)' : '是 (正向事件)';
                                                                const noLabel = isBinaryBad ? '否 (正向事件)' : '否 (負向事件)';

                                                                return (
                                                                    <>
                                                                        {renderBar(yesLabel, prob, isBinaryBad ? '#ef4444' : '#22c55e')}
                                                                        {renderBar(noLabel, 100 - prob, isBinaryBad ? '#22c55e' : '#71717a')}
                                                                    </>
                                                                );
                                                            })()}
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
                                                </TouchableOpacity >
                                            </View >
                                        )}
                                    </>
                                );
                            })()}
                        </TouchableOpacity >
                    );
                })}
            </View >

            {/* Footer */}
            < View style={styles.footer} >
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
            </View >
        </ScrollView >

            {/* Notification Panel */ }
    {
        showNotifications && (
            <View style={styles.notificationOverlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowNotifications(false)} />
                <View style={styles.drawerPanel}>
                    <Text style={styles.drawerTitle}>通知中心</Text>
                    <ScrollView style={{ maxHeight: '80%' }}>
                        {useNotificationStore.getState().notifications.length === 0 ? (
                            <Text style={{ color: '#71717a', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                                暫無通知
                            </Text>
                        ) : (
                            useNotificationStore.getState().notifications.map((n: NotificationItem) => (
                                <View key={n.id} style={styles.notificationItem}>
                                    <View style={styles.notifHeader}>
                                        <View style={[styles.dotSmall, {
                                            backgroundColor: n.type === 'SYSTEM' ? '#3b82f6' :
                                                n.type === 'VOLATILITY' ? '#ef4444' :
                                                    n.type === 'PHASE' ? '#10b981' : '#f59e0b'
                                        }]} />
                                        <Text style={styles.notifType}>{n.type}</Text>
                                    </View>
                                    <Text style={styles.notifContent}>{n.content}</Text>
                                    <Text style={styles.notifTime}>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        )
    }

    {/* Floating Merit UI (Bottom Right) */ }
    <View style={{ position: 'absolute', bottom: 30, right: 20, alignItems: 'flex-end', zIndex: 50 }}>
        {/* Stick Animation */}
        <TouchableOpacity onPress={handleMeritClick} activeOpacity={1} style={{ zIndex: 60 }}>
            <Animated.View style={[
                styles.woodenStick,
                {
                    transform: [
                        {
                            rotate: scaleAnim.interpolate({
                                inputRange: [0.8, 1],
                                outputRange: ['-45deg', '0deg'] // Hit effect
                            })
                        },
                        {
                            translateY: scaleAnim.interpolate({
                                inputRange: [0.8, 1],
                                outputRange: [15, 0]
                            })
                        }
                    ]
                }
            ]}>
                <View style={styles.stickHead} />
                <View style={styles.stickHandle} />
            </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
            style={styles.fishFab}
            onPress={handleMeritClick}
            activeOpacity={0.9}
        >
            <View style={{ marginRight: 12, alignItems: 'flex-end' }}>
                <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 16 }}>{faithClicks}</Text>
                <Text style={{ color: '#A1A1AA', fontSize: 10 }}>功德</Text>
            </View>
            <View style={styles.fishIconBg}>
                <Image
                    source={require('@/assets/images/wooden-fish.png')}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                />
            </View>
        </TouchableOpacity>

        {/* Settings Trigger - Bottom Right of Fab */}
        <TouchableOpacity
            style={styles.meritSettingsBtn}
            onPress={() => setShowMeritModal(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Ionicons name="settings-sharp" size={14} color="#52525b" />
        </TouchableOpacity>

        {showMerit && (
            <Animated.View style={[
                styles.meritPopup,
                {
                    opacity: plusOneAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [{
                        translateY: plusOneAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] })
                    }]
                }
            ]}>
                <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 14 }}>功德 +1</Text>
            </Animated.View>
        )}
    </View>

    {/* Merit Leaderboard Modal */ }
    {
        showMeritModal && (
            <View style={styles.modalOverlay}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowMeritModal(false)} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#a1a1aa" />
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', gap: 24 }}>
                            <TouchableOpacity onPress={() => setMeritTab('mine')} style={[styles.tabBtn, meritTab === 'mine' && styles.tabBtnActive]}>
                                <Text style={[styles.tabText, meritTab === 'mine' && styles.tabTextActive]}>您的貢獻</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setMeritTab('leaderboard')} style={[styles.tabBtn, meritTab === 'leaderboard' && styles.tabBtnActive]}>
                                <Text style={[styles.tabText, meritTab === 'leaderboard' && styles.tabTextActive]}>排行榜</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.modalBody}>
                        {meritTab === 'mine' ? (
                            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 60 }}>
                                {/* Merit Image */}
                                <View style={{
                                    width: 200, height: 200, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#3f3f46',
                                    shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20,
                                    marginBottom: 24
                                }}>
                                    <Image
                                        source={require('@/assets/images/bull_buddha.png')}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                </View>

                                <Text style={{ color: '#a1a1aa', fontSize: 15, marginBottom: 12, textAlign: 'center' }}>你已經為牛市回歸的念力增添了</Text>
                                <Text style={{ color: '#fbbf24', fontSize: 48, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 8 }}>
                                    {faithClicks}
                                </Text>
                                <Text style={{ color: '#52525b', fontSize: 13, marginBottom: 32 }}>
                                    佔全球貢獻 {(globalMerit > 0 ? (faithClicks / globalMerit * 100) : 0).toFixed(6)}%
                                </Text>
                            </View>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                                        <Text style={{ color: '#a1a1aa', fontSize: 13, textTransform: 'uppercase' }}>Global Total</Text>
                                        <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>
                                            {globalMerit.toLocaleString()}
                                        </Text>
                                    </View>

                                    <View style={{ backgroundColor: '#18181b', borderRadius: 12, overflow: 'hidden' }}>
                                        {leaderboard.map((u, i) => (
                                            <View key={u.id} style={styles.rankRow}>
                                                <View style={{ width: 40, alignItems: 'center' }}>
                                                    {i < 3 ? (
                                                        <Text style={{ fontSize: 20 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                                                    ) : (
                                                        <Text style={styles.rankNum}>#{i + 1}</Text>
                                                    )}
                                                </View>
                                                <Text style={styles.rankName}>
                                                    {u.displayName}
                                                    {u.id === user?.id && <Text style={{ color: '#fbbf24', fontSize: 12 }}> (你)</Text>}
                                                </Text>
                                                <Text style={styles.rankScore}>{u.merit.toLocaleString()}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>

                                {/* Pinned User Rank (if > 50) */}
                                {userRank > 50 && (
                                    <View style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        backgroundColor: '#27272a',
                                        borderTopWidth: 1,
                                        borderTopColor: '#3f3f46',
                                        paddingVertical: 12,
                                        paddingHorizontal: 0,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        borderBottomLeftRadius: 12,
                                        borderBottomRightRadius: 12
                                    }}>
                                        <View style={{ width: 40, alignItems: 'center' }}>
                                            <Text style={[styles.rankNum, { color: '#fbbf24' }]}>#{userRank}</Text>
                                        </View>
                                        <Text style={[styles.rankName, { color: '#fbbf24' }]}>
                                            {user?.name || 'You'} (你)
                                        </Text>
                                        <Text style={[styles.rankScore, { color: '#fbbf24' }]}>
                                            {faithClicks.toLocaleString()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </View>
        )
    }

    {/* Settings */ }
    {
        showSettings && (
            <>
                <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} activeOpacity={1} onPress={() => setShowSettings(false)} />
                <View style={styles.settingsOverlay}>

                    {/* Account Section (Moved to Top) */}
                    <Text style={styles.settingsSectionTitle}>帳號設定</Text>

                    <View style={[styles.settingsItem, { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 16 }]}>
                        <Text style={[styles.settingsItemLabel, { marginBottom: 8 }]}>顯示名稱</Text>
                        {!editingName ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#27272a', padding: 12, borderRadius: 8 }}>
                                <Text style={{ color: 'white', fontSize: 16 }}>{user?.name || 'Believer'}</Text>
                                <TouchableOpacity onPress={() => { setEditingName(true); setTempName(user?.name || ''); }}>
                                    <Ionicons name="pencil" size={16} color="#fbbf24" />
                                </TouchableOpacity>
                            </View>
                        ) : (
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
                                        borderColor: '#fbbf24',
                                        fontSize: 16
                                    }}
                                    value={tempName}
                                    onChangeText={setTempName}
                                    placeholder="輸入暱稱"
                                    placeholderTextColor="#52525b"
                                    autoFocus
                                />
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#fbbf24',
                                        paddingHorizontal: 16,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 8
                                    }}
                                    onPress={async () => {
                                        await handleUpdateName();
                                        setEditingName(false);
                                    }}
                                >
                                    <Text style={{ color: 'black', fontWeight: 'bold' }}>儲存</Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
        )
    }
        </SafeAreaView >
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
        width: 300,
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
    // Floating Merit Styles
    fishFab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        padding: 6,
        paddingLeft: 12, // Adjusted padding
        paddingRight: 6,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#3f3f46',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    woodenStick: {
        position: 'absolute',
        top: -30, // Adjusted position for rotation
        right: 0,
        zIndex: 50,
        alignItems: 'center',
        // Pivot point simulation via transform origin is hard in RN without anchor point usage in recent reanimated, 
        // but simple translation + rotation can fake it.
    },
    stickHead: {
        width: 12,
        height: 24,
        backgroundColor: '#78350F',
        borderRadius: 6,
        marginBottom: -4,
        zIndex: 2,
    },
    stickHandle: {
        width: 6,
        height: 48,
        backgroundColor: '#92400E',
        borderRadius: 3,
    },
    fishIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#3f3f46',
    },
    fishCounter: {
        alignItems: 'flex-end',
    },
    meritSettingsBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3f3f46',
        zIndex: 10,
    },
    meritPopup: {
        position: 'absolute',
        top: -40,
        right: 0,
        // No background, just text floating
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#09090b',
        zIndex: 200,
    },
    modalHeader: {
        flexDirection: 'column', // Stack close btn and tabs
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 0,
        backgroundColor: '#09090b',
    },
    modalBody: {
        flex: 1,
        padding: 24,
    },
    closeBtn: {
        alignSelf: 'flex-end',
        padding: 8,
        marginBottom: 8,
        backgroundColor: '#18181b',
        borderRadius: 20,
    },
    tabBtn: {
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabBtnActive: {
        borderBottomColor: '#fbbf24',
    },
    tabText: {
        color: '#71717a',
        fontSize: 18,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#fbbf24',
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
    },
    rankNum: {
        color: '#71717a',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rankTop: {
        color: '#fbbf24',
    },
    rankName: {
        flex: 1,
        color: '#e4e4e7',
        fontSize: 15,
        fontWeight: '500',
    },
    rankScore: {
        color: '#fbbf24',
        fontWeight: '600',
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
