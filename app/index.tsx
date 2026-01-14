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
import { Animated, Easing, Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch, TextInput, TouchableWithoutFeedback, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getGlobalMerit, getLeaderboard, getUserRank, syncUserMerit } from '@/services/meritService';
import { useTechStore } from '@/stores/techStore';
import { useAIStore } from '@/stores/aiStore';
import { useMarketInsights, MarketInsight } from '@/hooks/useMarketInsights';


export default function DashboardScreen() {
    const router = useRouter();
    const notifications = useNotificationStore((state) => state.notifications);
    const clearAllNotifications = useNotificationStore((state) => state.clearAll);
    const { getReversalIndex, getInterpretation, btcPrice, setBtcPrice, beliefs, faithClicks, incrementFaith } = useBeliefStore();
    const reversalIndex = getReversalIndex();
    const interpretation = getInterpretation();
    const [refreshing, setRefreshing] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Animation for Notification Drawer
    // Initial value is screen width (fully closed/off-screen to right)
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

    const openNotifications = () => {
        setShowNotifications(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start();
    };

    const closeNotifications = () => {
        Animated.timing(slideAnim, {
            toValue: Dimensions.get('window').width,
            duration: 250,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
        }).start(() => setShowNotifications(false));
    };

    const [btc24hChange, setBtc24hChange] = useState<number | null>(null);
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
    const [expandedTechItem, setExpandedTechItem] = useState<string | null>(null);
    const [showScoreInfo, setShowScoreInfo] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

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

    // Rocket Rumble Animation
    const rumbleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showMeritModal) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rumbleAnim, { toValue: -2, duration: 50, useNativeDriver: true }),
                    Animated.timing(rumbleAnim, { toValue: 2, duration: 50, useNativeDriver: true }),
                    Animated.timing(rumbleAnim, { toValue: -2, duration: 50, useNativeDriver: true }),
                    Animated.timing(rumbleAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
                ])
            ).start();
        } else {
            rumbleAnim.setValue(0);
        }
    }, [showMeritModal]);

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
                <TouchableOpacity onPress={openNotifications} style={styles.notificationBtn}>
                    <View style={styles.notificationIconWrapper}>
                        <Ionicons name="notifications-outline" size={20} color="white" />
                        <View style={styles.notificationBadge} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={[styles.notificationBtn, { marginLeft: 8, borderColor: '#3f3f46' }]}>
                    <Ionicons name="settings-outline" size={18} color="#A8A29E" />
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
                                <Ionicons name="help-circle-outline" size={20} color="#A8A29E" />
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
                                    default: return '#A8A29E';
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
                                                <View key={i} style={{ backgroundColor: 'rgba(39, 39, 42, 0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#374151' }}>
                                                    <Text style={{ color: '#A1A1AA', fontSize: 11 }}>{tag}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    {/* One Liner - Centered with Change Hint */}
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 24, textAlign: 'center' }}>
                                            {copy.oneLiner}
                                        </Text>
                                        {/* Change Hint (New) */}
                                        <Text style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                                            {reversalState.phaseCap < 100 ?
                                                `結構未確認 · 內部條件改善中 ↑` :
                                                `結構已確認 · 趨勢持續向上 ↑`}
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
                                        {/* New Cap Progress Label */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                                            <Text style={{ color: '#A8A29E', fontSize: 12 }}>
                                                結構進度: {Math.min(100, Math.round((reversalState.finalScore / reversalState.phaseCap) * 100))}%（{reversalState.phaseCap === 60 ? '累積期' : (reversalState.phaseCap === 75 ? '轉換期' : '擴張期')}）
                                            </Text>
                                            <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: '600' }}>
                                                ↑ (7d)
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Internal Change Summary (New Block) */}
                                    <View style={{ backgroundColor: 'rgba(39, 39, 42, 0.4)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
                                        <Text style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 8, fontWeight: '600' }}>內部變化（7 日）</Text>
                                        <View style={{ gap: 4 }}>
                                            <Text style={{ color: '#e4e4e7', fontSize: 13 }}>
                                                • 週期強度 <Text style={{ color: '#22c55e' }}>+{reversalState.cycleScoreRaw}</Text>（鏈上估值改善）
                                            </Text>
                                            <Text style={{ color: '#e4e4e7', fontSize: 13 }}>
                                                • 趨勢門檻: {Math.round(reversalState.trendScoreRaw / 25)} / 4（{reversalState.trendScoreRaw >= 75 ? '動能強勁' : '尚未新增門檻'}）
                                            </Text>
                                            <Text style={{ color: '#e4e4e7', fontSize: 13 }}>
                                                • 結構上限未變（{reversalState.phaseCap === 60 ? '累積期' : (reversalState.phaseCap === 75 ? '轉換期' : '擴張期')}）
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
                                                <Ionicons name="refresh" size={16} color="#A8A29E" />
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
                                                return <Text style={{ color: '#A8A29E', fontSize: 13 }}>尚無分析數據</Text>;
                                            }

                                            return top3.map((c) => {
                                                const isExpanded = expandedTechItem === c.id;

                                                // Enhance Status Text based on condition type (Mock logic for now as requested by UI prototype)
                                                let statusSuffix = '';
                                                let statusColor = c.passed ? '#10b981' : '#A8A29E';

                                                if (c.passed) {
                                                    statusSuffix = '（新確認）↑';
                                                    if (c.id === 'volatility_compression') statusSuffix = '（持續下降）↓';
                                                } else {
                                                    statusSuffix = '（接近中）';
                                                }

                                                return (
                                                    <TouchableOpacity
                                                        key={c.id}
                                                        onPress={() => setExpandedTechItem(isExpanded ? null : c.id)}
                                                        activeOpacity={0.7}
                                                        style={{ marginBottom: 8 }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                            <Text style={{ color: c.passed ? '#10b981' : '#A8A29E', fontSize: 13, marginRight: 6, marginTop: 1 }}>
                                                                {c.passed ? '✓' : '•'}
                                                            </Text>
                                                            <View style={{ flex: 1 }}>
                                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                                                    <Text style={{ color: '#E7E5E4', fontWeight: '500', marginRight: 4 }}>
                                                                        {c.nameCN}
                                                                    </Text>
                                                                    <Text style={{ color: '#A8A29E' }}>
                                                                        {isExpanded ? '' : `：${c.passed ? (c.detail || '條件成立') : '條件未滿足'}${statusSuffix} `}
                                                                    </Text>
                                                                </View>

                                                                {/* Expanded Content */}
                                                                {isExpanded && (
                                                                    <View style={{ marginTop: 4 }}>
                                                                        <Text style={{ color: '#F5F5DC', fontSize: 13, marginBottom: 2 }}>
                                                                            狀態：{c.passed ? (c.detail || '條件成立') : '條件未滿足'} {statusSuffix}
                                                                        </Text>
                                                                        <Text style={{ color: '#A8A29E', fontSize: 12, lineHeight: 18 }}>
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
                    animationType="slide"
                    onRequestClose={() => { setShowScoreInfo(false); setExpandedFaq(null); }}
                >
                    <View style={{ flex: 1, backgroundColor: '#1F2937' }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
                            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>反轉指數說明</Text>
                            <TouchableOpacity onPress={() => { setShowScoreInfo(false); setExpandedFaq(null); }}>
                                <Ionicons name="close" size={24} color="#A8A29E" />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable FAQ Content */}
                        <ScrollView style={{ flex: 1, padding: 16 }}>
                            {/* FAQ Item 1: Overview */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'overview' ? null : 'overview')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#F5F5DC', fontSize: 15, fontWeight: '600' }}>📊 計算公式總覽</Text>
                                    <Ionicons name={expandedFaq === 'overview' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'overview' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        <Text style={{ color: '#E7E5E4', fontSize: 13, lineHeight: 22 }}>
                                            反轉指數 = min(階段上限, 技術結構分數 + 市場動能分數 + 敘事權重分數){'\n\n'}
                                            • 技術結構 (Gates): 0-25 分{'\n'}
                                            • 市場動能 (Boosters): 0-25 分{'\n'}
                                            • 敘事權重 (Narrative): 0-50 分{'\n'}
                                            • 階段上限 (Phase Cap): 60/75/100
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* FAQ Item 2: Gates */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'gates' ? null : 'gates')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#22c55e', fontSize: 15, fontWeight: '600' }}>🚪 技術結構 (Gates)</Text>
                                    <Ionicons name={expandedFaq === 'gates' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'gates' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        <Text style={{ color: '#E7E5E4', fontSize: 13, lineHeight: 22 }}>
                                            4 大核心過濾條件，每個通過得 6.25 分（最高 25 分）：{'\n\n'}
                                            1. <Text style={{ color: '#fff', fontWeight: '600' }}>結構性低點抬升</Text>{'\n'}
                                            週線形成 Higher Low（價格低點逐漸抬高）{'\n\n'}
                                            2. <Text style={{ color: '#fff', fontWeight: '600' }}>波動率壓縮</Text>{'\n'}
                                            歷史百分位低於 10%（市場處於低波動狀態）{'\n\n'}
                                            3. <Text style={{ color: '#fff', fontWeight: '600' }}>價格 vs 長期均線</Text>{'\n'}
                                            價格站上 200 日均線{'\n\n'}
                                            4. <Text style={{ color: '#fff', fontWeight: '600' }}>交易量確認</Text>{'\n'}
                                            成交量高於 20 日均量
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* FAQ Item 3: Boosters */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'boosters' ? null : 'boosters')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#3b82f6', fontSize: 15, fontWeight: '600' }}>🚀 市場動能 (Boosters)</Text>
                                    <Ionicons name={expandedFaq === 'boosters' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'boosters' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        <Text style={{ color: '#E7E5E4', fontSize: 13, lineHeight: 22 }}>
                                            4 大輔助因子，每個通過得 6.25 分（最高 25 分）：{'\n\n'}
                                            1. <Text style={{ color: '#fff', fontWeight: '600' }}>MVRV Z-Score</Text>{'\n'}
                                            低於 1 表示市場處於低估區間{'\n\n'}
                                            2. <Text style={{ color: '#fff', fontWeight: '600' }}>恐懼貪婪指數</Text>{'\n'}
                                            低於 25 表示極度恐懼（逆向指標）{'\n\n'}
                                            3. <Text style={{ color: '#fff', fontWeight: '600' }}>資金費率</Text>{'\n'}
                                            負值表示空頭過度擁擠{'\n\n'}
                                            4. <Text style={{ color: '#fff', fontWeight: '600' }}>穩定幣流入</Text>{'\n'}
                                            大額穩定幣流入表示買盤準備
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* FAQ Item 4: Narrative */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'narrative' ? null : 'narrative')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#f97316', fontSize: 15, fontWeight: '600' }}>📰 敘事權重 (Narrative)</Text>
                                    <Ionicons name={expandedFaq === 'narrative' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'narrative' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        <Text style={{ color: '#E7E5E4', fontSize: 13, lineHeight: 22 }}>
                                            AI 分析的市場情緒與宏觀事件影響（最高 50 分）：{'\n\n'}
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>計算方式</Text>：{'\n'}
                                            根據追蹤的市場事件機率加權計算{'\n\n'}
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>包含因素</Text>：{'\n'}
                                            • 比特幣儲備政策機率{'\n'}
                                            • ETF 資金流入趨勢{'\n'}
                                            • 監管政策發展{'\n'}
                                            • 宏觀經濟事件
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* FAQ Item 5: Phase Cap */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'phase' ? null : 'phase')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#eab308', fontSize: 15, fontWeight: '600' }}>📈 階段上限 (Phase Cap)</Text>
                                    <Ionicons name={expandedFaq === 'phase' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'phase' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        <Text style={{ color: '#E7E5E4', fontSize: 13, lineHeight: 22 }}>
                                            根據 Gates 通過數量決定指數上限：{'\n\n'}
                                            • <Text style={{ color: '#ef4444', fontWeight: '600' }}>累積期 (0-1 Gates)</Text>：上限 60{'\n'}
                                            市場尚未形成明確結構{'\n\n'}
                                            • <Text style={{ color: '#3b82f6', fontWeight: '600' }}>轉換期 (2-3 Gates)</Text>：上限 75{'\n'}
                                            結構正在改善中{'\n\n'}
                                            • <Text style={{ color: '#22c55e', fontWeight: '600' }}>擴張期 (4 Gates)</Text>：上限 100{'\n'}
                                            所有核心條件已滿足
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* FAQ Item 6: Score Range */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 24, overflow: 'hidden' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'range' ? null : 'range')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#F5F5DC', fontSize: 15, fontWeight: '600' }}>🎯 分數區間說明</Text>
                                    <Ionicons name={expandedFaq === 'range' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'range' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        <Text style={{ color: '#E7E5E4', fontSize: 13, lineHeight: 22 }}>
                                            • <Text style={{ color: '#ef4444', fontWeight: '600' }}>0-20</Text>：下跌趨勢{'\n'}
                                            市場處於明顯下行階段{'\n\n'}
                                            • <Text style={{ color: '#f97316', fontWeight: '600' }}>20-50</Text>：觀察區{'\n'}
                                            開始出現底部訊號，但未確認{'\n\n'}
                                            • <Text style={{ color: '#eab308', fontWeight: '600' }}>50-80</Text>：早期訊號{'\n'}
                                            結構改善，可考慮分批佈局{'\n\n'}
                                            • <Text style={{ color: '#22c55e', fontWeight: '600' }}>80-100</Text>：確認反轉{'\n'}
                                            多數條件滿足，趨勢轉多
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* DEBUG SECTION (Added for verification) */}
                            <TouchableOpacity
                                style={{ backgroundColor: '#374151', borderRadius: 8, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#4b5563' }}
                                onPress={() => setExpandedFaq(expandedFaq === 'debug' ? null : 'debug')}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                    <Text style={{ color: '#F5F5DC', fontSize: 15, fontWeight: '600' }}>🛠️ 系統診斷 (Debug)</Text>
                                    <Ionicons name={expandedFaq === 'debug' ? 'chevron-up' : 'chevron-down'} size={20} color="#A8A29E" />
                                </View>
                                {expandedFaq === 'debug' && (
                                    <View style={{ padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#374151' }}>
                                        {(() => {
                                            const { conditions, reversalState, gateCount } = useTechStore.getState();
                                            return (
                                                <>
                                                    <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#18181b', borderRadius: 8 }}>
                                                        <Text style={{ color: '#E7E5E4', fontSize: 13, marginBottom: 4, fontWeight: 'bold' }}>
                                                            核心分數結構
                                                        </Text>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 12 }}>
                                                            • 最終指數: <Text style={{ color: '#F5F5DC' }}>{reversalIndex}</Text>{'\n'}
                                                            • Trend Score (技術): <Text style={{ color: '#3b82f6' }}>{reversalState?.trendScoreRaw ?? 0}</Text> (Gates: {gateCount}/4){'\n'}
                                                            • Cycle Score (籌碼): <Text style={{ color: '#f59e0b' }}>{reversalState?.cycleScoreRaw ?? 0}</Text>{'\n'}
                                                            <Text style={{ fontSize: 10, color: '#52525b' }}>   (Base: {reversalState?.cycleBase ?? 0} + User: {reversalState?.cycleUser?.toFixed(1) ?? 0})</Text>
                                                        </Text>
                                                    </View>

                                                    <Text style={{ color: '#A8A29E', fontSize: 12, marginBottom: 8 }}>Gate 狀態 (趨勢核心):</Text>
                                                    {conditions.filter((c: any) => c.group === 'Gate').map((c: any) => (
                                                        <View key={c.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                <Text style={{ color: c.passed ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: '500' }}>
                                                                    {c.passed ? '✅' : '❌'} {c.nameCN}
                                                                </Text>
                                                                <Text style={{ color: '#78716c', fontSize: 11 }}>{Math.round(c.score * 100)}%</Text>
                                                            </View>
                                                            <Text style={{ color: '#a1a1aa', fontSize: 11, marginTop: 2 }}>{c.detail}</Text>
                                                        </View>
                                                    ))}

                                                    <Text style={{ color: '#A8A29E', fontSize: 12, marginBottom: 8, marginTop: 12 }}>Booster 狀態 (輔助):</Text>
                                                    {conditions.filter((c: any) => c.group === 'Booster').map((c: any) => (
                                                        <View key={c.id} style={{ marginBottom: 6 }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                                <Text style={{ color: c.passed ? '#10b981' : '#52525b', fontSize: 12 }}>
                                                                    {c.passed ? '⚡' : '⚪'} {c.nameCN}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </View>
                                )}
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Close Button */}
                        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#374151' }}>
                            <TouchableOpacity
                                style={{ backgroundColor: '#F5F5DC', paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
                                onPress={() => { setShowScoreInfo(false); setExpandedFaq(null); }}
                            >
                                <Text style={{ color: '#1F2937', fontWeight: '700', fontSize: 15 }}>了解</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 2.5. CARD: Contribution & Leaderboard (Restored) */}


                {/* 3. CARD 2: Technical Analysis Status (Local Logic) */}
                <View style={[styles.card, { paddingVertical: 20 }]}>
                    <View style={[styles.cardHeader, { marginBottom: 16 }]}>
                        <Text style={styles.cardHeaderTitle}>技術分析狀態</Text>
                        {/* Timestamp */}
                        <Text style={{ color: '#A8A29E', fontSize: 11 }}>
                            {(() => {
                                const ts = useTechStore.getState().lastEvaluated || Date.now();
                                const d = new Date(ts);
                                return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                            })()}
                        </Text>
                    </View>

                    {/* Technical Conditions List */}
                    <View style={{ marginBottom: 20 }}>
                        {(() => {
                            const { conditions, gateCount } = useTechStore.getState();
                            const gates = conditions.filter((c: any) => c.group === 'Gate');

                            return gates.map((gate: any) => (
                                <View key={gate.id} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 14, marginRight: 8, marginTop: 2 }}>
                                        {gate.passed ? '✅' : '・'}
                                    </Text>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={{ color: gate.passed ? '#F5F5DC' : '#A8A29E', fontSize: 14, fontWeight: '600' }}>
                                                {gate.nameCN}
                                            </Text>
                                            <Text style={{ color: '#A8A29E', fontSize: 12 }}>
                                                : {gate.detail?.split('(')[0].trim() || gate.detail}
                                            </Text>
                                        </View>
                                        {gate.passed && (
                                            <Text style={{ color: '#10b981', fontSize: 11, marginTop: 2 }}>
                                                (新確認) ↑
                                            </Text>
                                        )}
                                        {!gate.passed && (
                                            <Text style={{ color: '#52525b', fontSize: 11, marginTop: 2 }}>
                                                條件未滿足 (接近中)
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ));
                        })()}
                    </View>

                    {/* Next Step Suggestion */}
                    <View>
                        <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>下一步</Text>
                        {(() => {
                            const { gateCount } = useTechStore.getState();

                            // Rule-based suggestions
                            return (
                                <View style={{ gap: 8 }}>
                                    {gateCount < 2 && (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F5F5DC', fontSize: 14 }}>👉 市場觀望氣氛濃厚，建議耐心等待</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F5F5DC', fontSize: 14 }}>👉 關注均線是否開始走平 (Gate 2)</Text>
                                            </View>
                                        </>
                                    )}
                                    {gateCount >= 2 && gateCount < 4 && (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F5F5DC', fontSize: 14 }}>👉 可以先規劃小額分批策略</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F5F5DC', fontSize: 14 }}>👉 重點看價格是否開始轉強 (Gate 3/4)</Text>
                                            </View>
                                        </>
                                    )}
                                    {gateCount === 4 && (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F5F5DC', fontSize: 14 }}>👉 趨勢確立，與市場同步</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: '#F5F5DC', fontSize: 14 }}>👉 留意 120MA 支撐位</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            );
                        })()}
                    </View>
                </View>

                {/* 3.1 CARD: Market News (Restored & Cleaned) */}
                <View style={[styles.card, { paddingVertical: 20 }]}>
                    <View style={[styles.cardHeader, { marginBottom: 16 }]}>
                        <Text style={styles.cardHeaderTitle}>市場焦點新聞</Text>
                    </View>

                    {/* Loading State */}
                    {marketInsightsLoading && (
                        <View style={{ padding: 12, backgroundColor: 'rgba(251, 191, 36, 0.05)', borderRadius: 8, marginBottom: 16 }}>
                            <Text style={{ color: '#F5F5DC', fontSize: 13 }}>正在載入新聞...</Text>
                        </View>
                    )}

                    {/* News Display */}
                    {!marketInsightsLoading && allMarketInsights.length > 0 && (
                        <View>
                            {allMarketInsights.slice(0, 3).map((insight: any, index) => {
                                // Clean Headline regex
                                const cleanHeadline = insight.headline
                                    .replace(/\s*-\s*TradingView.*$/i, '')
                                    .replace(/\s*-\s*Yahoo Finance.*$/i, '')
                                    .replace(/\s*-\s*[^-]*$/, '');

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={{ marginBottom: 20 }}
                                        onPress={() => {
                                            if (insight.url && typeof window !== 'undefined') {
                                                window.open(insight.url, '_blank');
                                            } else if (insight.url) {
                                                Linking.openURL(insight.url);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                            <Text style={{ color: '#F5F5DC', fontSize: 13, marginRight: 8 }}>•</Text>
                                            <Text style={{ color: '#A8A29E', fontSize: 12, fontWeight: '400' }}>
                                                {insight.eventTitle || '市場關注事件'}
                                            </Text>
                                        </View>
                                        <View style={{ paddingLeft: 16, marginBottom: 6 }}>
                                            <Text style={{ color: '#E7E5E4', fontSize: 14, lineHeight: 22, fontWeight: '400' }}>{insight.analysis}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 14 }}>
                                            <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: '#A8A29E', fontSize: 12, flex: 1, marginRight: 8, textDecorationLine: 'underline' }}>{cleanHeadline}</Text>
                                            <Ionicons name="open-outline" size={12} color="#A8A29E" />
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
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
                                                <Text style={{ color: '#E7E5E4', fontSize: 13 }}>{label}</Text>
                                                <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{val}%</Text>
                                            </View>
                                            <View style={{ height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' }}>
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
                                                    <Text style={{ color: '#e4e4e7', fontSize: 13, fontWeight: '600', marginBottom: 16, lineHeight: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#374151' }}>
                                                        {marketTitle}
                                                    </Text>

                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#374151', padding: 8, borderRadius: 6 }}>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 12 }}>敘事貢獻 (Score)</Text>
                                                        <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>
                                                            +{contribution.toFixed(2)} / 5.00 pts
                                                        </Text>
                                                    </View>

                                                    <View style={{ marginBottom: 16 }}>
                                                        <Text style={{ color: '#A8A29E', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>結果分佈 (Outcomes)</Text>
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
                                                                            {renderBar(noLabel, 100 - prob, isBinaryBad ? '#22c55e' : '#A8A29E')}
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
                            <Ionicons name="logo-instagram" size={20} color="#A8A29E" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL('https://t.me/+BKg09wTOVGZhYzBl')} style={styles.socialBtn}>
                            <Ionicons name="paper-plane-outline" size={20} color="#A8A29E" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.footerVersion}>Believer System V5.4 (Traditional Chinese)</Text>
                </View >
            </ScrollView >

            {/* Notification Panel */}
            {
                showNotifications && (
                    <View style={styles.notificationOverlay}>
                        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeNotifications} />
                        <Animated.View style={[
                            styles.drawerPanel,
                            {
                                transform: [{ translateX: slideAnim }]
                            }
                        ]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <Text style={styles.drawerTitle}>通知中心</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <TouchableOpacity onPress={clearAllNotifications}>
                                        <Text style={{ color: '#A8A29E', fontSize: 13 }}>清除全部</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={closeNotifications} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Ionicons name="close" size={24} color="#A8A29E" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView style={{ flex: 1 }}>
                                {notifications.length === 0 ? (
                                    <Text style={{ color: '#A8A29E', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                                        暫無通知
                                    </Text>
                                ) : (
                                    notifications.map((n: NotificationItem) => (
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
                        </Animated.View>
                    </View>
                )
            }

            {/* Floating Merit UI (Bottom Right) */}
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

            {/* Merit Leaderboard Modal */}
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
                                            width: 380, height: 380,
                                            marginBottom: 24,
                                            overflow: 'hidden', // Clip the scaled content
                                            alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Animated.View style={{
                                                width: '100%', height: '100%',
                                                transform: [
                                                    { translateX: rumbleAnim },
                                                    { translateY: Animated.multiply(rumbleAnim, -1) }, // Shake diagonally
                                                    { scale: 1.1 } // Zoom 110% to push watermark out
                                                ]
                                            }}>
                                                <Image
                                                    source={require('@/assets/images/bull_rocket.jpg')}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                            </Animated.View>
                                        </View>

                                        <Text style={{ color: '#a1a1aa', fontSize: 15, marginBottom: 12, textAlign: 'center' }}>你已經為牛市回歸的念力增添了</Text>
                                        <Text style={{ color: '#F5F5DC', fontSize: 48, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 8 }}>
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
                                                            {u.id === user?.id && <Text style={{ color: '#F5F5DC', fontSize: 12 }}> (你)</Text>}
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
                                                backgroundColor: '#374151',
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
                                                    <Text style={[styles.rankNum, { color: '#F5F5DC' }]}>#{userRank}</Text>
                                                </View>
                                                <Text style={[styles.rankName, { color: '#F5F5DC' }]}>
                                                    {user?.name || 'You'} (你)
                                                </Text>
                                                <Text style={[styles.rankScore, { color: '#F5F5DC' }]}>
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

            {/* Settings */}
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#374151', padding: 12, borderRadius: 8 }}>
                                        <Text style={{ color: 'white', fontSize: 16 }}>{user?.name || 'Believer'}</Text>
                                        <TouchableOpacity onPress={() => { setEditingName(true); setTempName(user?.name || ''); }}>
                                            <Ionicons name="pencil" size={16} color="#F5F5DC" />
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
                                                borderColor: '#F5F5DC',
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
                                                backgroundColor: '#F5F5DC',
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

                            <View style={{ height: 1, backgroundColor: '#374151', marginVertical: 16 }} />

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

                                <TouchableOpacity style={[styles.settingsItem, { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12 }]} onPress={handleResetData}>
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
        backgroundColor: '#1F2937',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
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
        borderColor: '#374151',
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
        borderColor: '#374151',
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
        backgroundColor: '#374151',
        borderRadius: 2,
    },
    progressContext: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#374151',
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
        borderColor: '#374151',
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
        color: '#F5F5DC',
    },
    viewMarketBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        backgroundColor: '#374151',
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
        borderColor: '#374151',
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
        borderColor: '#374151',
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
        // Remove justifyContent: 'flex-end', we want full coverage
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
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '80%', // Takes up 80% of width
        maxWidth: 320,
        backgroundColor: '#18181b',
        // Removed top radius, add left border?
        borderLeftWidth: 1,
        borderLeftColor: '#374151',
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40, // More top padding for status bar/safe area
        shadowColor: "#000",
        shadowOffset: {
            width: -2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    drawerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        // marginBottom moved to component for flex layout
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
        color: '#A8A29E',
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
        color: '#A8A29E',
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
        color: '#A8A29E',
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
        backgroundColor: '#374151',
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
        backgroundColor: '#374151',
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
        backgroundColor: '#1F2937',
        zIndex: 200,
    },
    modalHeader: {
        flexDirection: 'column', // Stack close btn and tabs
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 0,
        backgroundColor: '#1F2937',
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
        borderBottomColor: '#F5F5DC',
    },
    tabText: {
        color: '#A8A29E',
        fontSize: 18,
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#F5F5DC',
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    rankNum: {
        color: '#A8A29E',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rankTop: {
        color: '#F5F5DC',
    },
    rankName: {
        flex: 1,
        color: '#e4e4e7',
        fontSize: 15,
        fontWeight: '500',
    },
    rankScore: {
        color: '#F5F5DC',
        fontWeight: '600',
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
