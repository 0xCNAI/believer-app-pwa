import { resolveReversalCopy } from '@/services/copyService';
import { BELIEVER_SIGNALS } from '@/services/marketData';
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
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // ...

    // ADD NEW STYLES HERE
    const stickAnim = useRef(new Animated.Value(0)).current; // 0 = resting, 1 = hit

    const handleFishClick = () => {
        incrementFaith();

        // Haptics with Web Fallback (Trigger on Impact)
        const triggerHaptic = () => {
            if (Platform.OS === 'web') {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10);
                }
            } else {
                import('expo-haptics').then(Haptics => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }).catch(() => { });
            }
        };

        // Coordinated Animation: Stick Hit -> Fish Bounce
        Animated.sequence([
            // 1. Stick swings down (Hit)
            Animated.timing(stickAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: Platform.OS !== 'web',
                easing: Easing.in(Easing.quad),
            }),
            // 2. Impact! (Stick moves back up + Fish Bounces)
            Animated.parallel([
                Animated.timing(stickAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: Platform.OS !== 'web',
                    easing: Easing.out(Easing.quad),
                }),
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 0.9,
                        duration: 50,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: Platform.OS !== 'web',
                        easing: Easing.elastic(1.5),
                    })
                ])
            ])
        ]).start();

        // Trigger haptic slightly after start to sync with impact
        setTimeout(triggerHaptic, 100);

        setShowMerit(true);
        setTimeout(() => setShowMerit(false), 500);
    };

    // Debug Log
    console.log('[Dashboard] Rendering. Index:', reversalIndex);

    // 1. BTC Price - Real API with 24h change
    useEffect(() => {
        console.log('[Dashboard] Mount: Fetching BTC Price & refreshing TechStore...');

        // Trigger TechStore update on mount
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

        // Refresh Beliefs (Polymarkets Data)
        try {
            useBeliefStore.getState().refreshBeliefs();
        } catch (e) { }

        const interval = setInterval(fetchBtcPrice, 60000); // Update every 60s
        return () => clearInterval(interval);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        console.log('[Dashboard] Manual Refresh Triggered');
        require('@/stores/techStore').useTechStore.getState().fetchAndEvaluate();
        setTimeout(() => setRefreshing(false), 1500);
    };

    const openSignals = (category: string) => {
        router.push({ pathname: "/signals", params: { category } });
    };

    const openTechConfig = () => {
        router.push('/tech-config');
    }

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
                    <Text style={styles.headerBrand}>Believer V1.5</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setShowNotifications(true)}
                    style={styles.notificationBtn}
                >
                    <View style={styles.notificationIconWrapper}>
                        <Ionicons name="notifications-outline" size={20} color="white" />
                        <View style={styles.notificationBadge} />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setShowSettings(!showSettings)}
                    style={[styles.notificationBtn, { marginLeft: 8, borderColor: '#3f3f46' }]}
                >
                    <Ionicons name="settings-outline" size={18} color="#71717a" />
                </TouchableOpacity>
            </View >

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {/* BTC Price Header */}
                <View style={styles.marketAnchor}>
                    <Text style={styles.anchorValue}>BTC ${roundedPrice}</Text>
                    {btc24hChange !== null && (
                        <Text style={[
                            styles.btcChange,
                            { color: btc24hChange >= 0 ? '#22c55e' : '#ef4444' }
                        ]}>
                            {btc24hChange >= 0 ? '+' : ''}{btc24hChange.toFixed(2)}% (24h)
                        </Text>
                    )}
                </View>

                {/* Core Metric: Reversal Index (V2 Simplified) */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardHeaderLabel}>Reversal Index</Text>
                            <Text style={styles.cardHeaderTitle}>反轉指數</Text>
                        </View>
                    </View>

                    {/* V2: Just the number, bright color */}
                    <View style={styles.indexMeter}>
                        {(() => {
                            let color = '#71717a';
                            if (reversalIndex < 40) color = '#ef4444'; // Red
                            else if (reversalIndex < 60) color = '#f97316'; // Orange
                            else if (reversalIndex < 75) color = '#eab308'; // Yellow
                            else color = '#22c55e'; // Green

                            return (
                                <Text style={[styles.indexValue, { color }]}>
                                    {reversalIndex.toFixed(0)}
                                </Text>
                            );
                        })()}

                        {/* Dual-Track Sub-scores - Hidden but data preserved for internal logic */}
                        {/* Viewing these scores now happens in Tech Config only
                        {(() => {
                            try {
                                const { reversalState } = require('@/stores/techStore').useTechStore();
                                if (!reversalState) return null;
                                return (
                                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#71717A', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' }}>Cycle (Fund)</Text>
                                            <Text style={{ color: '#E4E4E7', fontSize: 16, fontWeight: '700' }}>{reversalState.cycleScore.toFixed(0)}</Text>
                                        </View>
                                        <View style={{ width: 1, height: '100%', backgroundColor: '#27272A' }} />
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ color: '#71717A', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' }}>Trend (Tech)</Text>
                                            <Text style={{ color: '#E4E4E7', fontSize: 16, fontWeight: '700' }}>{reversalState.trendScore.toFixed(0)}</Text>
                                        </View>
                                    </View>
                                );
                            } catch (e) { return null; }
                        })()}
                        */}
                    </View>

                    {/* V2: Reversal Stage Display */}
                    {/* V2: Reversal Stage Display (AI Copywriting) */}
                    <View style={styles.progressSection}>
                        {(() => {
                            try {
                                const { reversalState } = require('@/stores/techStore').useTechStore();
                                // Generate Copy
                                const copy = resolveReversalCopy(reversalState);

                                // Color Logic
                                const getStageColor = (stage: string) => {
                                    switch (stage) {
                                        case 'OVERHEATED': return '#ef4444';
                                        case 'CONFIRMED': return '#22c55e';
                                        case 'PREPARE': return '#eab308'; // dimmed yellow
                                        case 'WATCH': return '#f97316';
                                        default: return '#71717a';
                                    }
                                };
                                const activeColor = getStageColor(copy.displayStage);

                                return (
                                    <>
                                        {/* 1. Header: Stage Title & Tags */}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={[styles.progressLabel, { color: activeColor, marginBottom: 0 }]}>
                                                    {copy.title}
                                                </Text>
                                                {/* Tags */}
                                                {copy.tags?.map((tag, i) => (
                                                    <View key={i} style={{
                                                        backgroundColor: 'rgba(39, 39, 42, 0.5)',
                                                        paddingHorizontal: 8, paddingVertical: 2,
                                                        borderRadius: 4, borderWidth: 1, borderColor: '#27272A'
                                                    }}>
                                                        <Text style={{ color: '#A1A1AA', fontSize: 10, fontWeight: '600' }}>{tag}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>

                                        {/* 2. One Liner (Hero) */}
                                        <Text style={{
                                            color: '#FFFFFF',
                                            fontSize: 16,
                                            fontWeight: '700',
                                            lineHeight: 24,
                                            marginBottom: 16
                                        }}>
                                            {copy.oneLiner}
                                        </Text>

                                        {/* 3. Progress Bar (Visual) */}
                                        <View style={styles.progressBar}>
                                            {[...Array(8)].map((_, i) => {
                                                const filled = reversalIndex > (i * 12.5);
                                                return (
                                                    <View
                                                        key={i}
                                                        style={[
                                                            styles.progressBlock,
                                                            filled && { backgroundColor: activeColor, opacity: 0.8 } // Tint with stage color
                                                        ]}
                                                    />
                                                );
                                            })}
                                        </View>

                                        {/* 4. Context: Reason & Next Steps */}
                                        <View style={styles.progressContext}>
                                            {/* Reasons */}
                                            <View style={{ marginBottom: 16 }}>
                                                <Text style={styles.contextTitle}>目前的依據</Text>
                                                {copy.reasonLines.map((line, i) => (
                                                    <Text key={i} style={styles.contextItem}>• {line}</Text>
                                                ))}
                                            </View>

                                            {/* Next Steps */}
                                            <View>
                                                <Text style={[styles.contextTitle, { color: activeColor }]}>下一步</Text>
                                                {copy.next.map((line, i) => (
                                                    <Text key={i} style={styles.contextItem}>👉 {line}</Text>
                                                ))}
                                            </View>
                                        </View>
                                    </>
                                );
                            } catch (e) {
                                return <Text style={{ color: '#71717A' }}>Loading Analysis...</Text>;
                            }
                        })()}
                    </View>

                    {/* V2: Market Dynamics (Real User Signals) */}
                    <View style={styles.dynamicsBox}>
                        <Text style={styles.dynamicsLabel}>市場動態（Market Dynamics）</Text>

                        {beliefs.length === 0 ? (
                            <Text style={{ color: '#71717A', marginTop: 8 }}>尚未追蹤任何市場信號。</Text>
                        ) : (
                            beliefs.filter(b => !b.id.startsWith('custom')).slice(0, 3).map((belief) => {
                                // Use getPositiveProbability for accurate calculation
                                const market = belief.marketEvent.markets?.[0];
                                let probRaw = belief.currentProbability;

                                // If market exists, use smart probability calculation
                                if (market && market.outcomePrices) {
                                    try {
                                        const { getPositiveProbability } = require('@/services/marketData');
                                        probRaw = getPositiveProbability(belief.id, market);
                                    } catch (e) { /* fallback to stored value */ }
                                }

                                const prob = Math.round(probRaw * 100);
                                const isPositive = prob > 50;
                                const probText = prob > 0 ? `${prob}%` : '載入中...';

                                let interpret = '→ 市場共識未形成';
                                let impact = '→ 影響中性';

                                if (prob === 0) {
                                    interpret = '→ 數據載入中';
                                    impact = '→ 請稍候';
                                } else if (prob >= 70) {
                                    interpret = '→ 市場高度共識';
                                    impact = '→ 強化當前趨勢';
                                } else if (prob >= 55) {
                                    interpret = '→ 市場預期偏高';
                                    impact = '→ 支撐力道增強';
                                } else if (prob <= 30) {
                                    interpret = '→ 市場預期低落';
                                    impact = '→ 潛在利空風險';
                                } else if (prob <= 45) {
                                    interpret = '→ 市場信心不足';
                                    impact = '→ 動能稍微轉弱';
                                }

                                return (
                                    <View key={belief.id} style={styles.dynamicItem}>
                                        <Text style={styles.dynamicChange}>• {belief.marketEvent.title} ({probText})</Text>
                                        <Text style={styles.dynamicInterpret}>{interpret}</Text>
                                        <Text style={styles.dynamicImpact}>{impact}</Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                {/* Market Expectations - User's Selected Topics */}
                <View>
                    <Text style={styles.sectionTitle}>市場預期</Text>



                    {/* User's Selected Prediction Topics */}
                    {/* User's Selected Prediction Topics - STRICT FILTER */}
                    {beliefs.filter(b => BELIEVER_SIGNALS.some(s => s.id === b.id)).length > 0 ? (
                        beliefs
                            .filter(b => BELIEVER_SIGNALS.some(s => s.id === b.id))
                            .map((belief) => {
                                const probRaw = belief.currentProbability;
                                const prob = Math.round(probRaw * 100); // Convert 0-1 to 0-100
                                const probText = `${prob}%`;
                                const isPositive = prob >= 50;
                                const isExpanded = expandedTopic === belief.id;

                                return (
                                    <TouchableOpacity
                                        key={belief.id}
                                        style={[styles.topicCard, isExpanded && styles.topicCardExpanded]}
                                        onPress={() => setExpandedTopic(isExpanded ? null : belief.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.topicHeader}>
                                            <View style={styles.topicLeft}>
                                                <View style={[
                                                    styles.topicDot,
                                                    { backgroundColor: isPositive ? '#22c55e' : '#ef4444' }
                                                ]} />
                                                <View style={styles.topicInfo}>
                                                    <Text style={styles.topicTitle}>{belief.marketEvent.title}</Text>
                                                    <Text style={styles.topicDesc} numberOfLines={isExpanded ? 0 : 1}>
                                                        {belief.marketEvent.description}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.topicRight}>
                                                <Text style={[
                                                    styles.topicProb,
                                                    { color: isPositive ? '#22c55e' : '#ef4444' }
                                                ]}>
                                                    {probText}
                                                </Text>
                                                <Text style={styles.topicSource}>
                                                    {belief.marketEvent.source}
                                                </Text>
                                            </View>
                                        </View>

                                        {isExpanded && (
                                            <View style={styles.topicDetails}>
                                                <View style={styles.detailRow}>
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>交易量 (Volume)</Text>
                                                        <Text style={styles.detailValue}>
                                                            {(() => {
                                                                const vol = belief.marketEvent.markets[0]?.volume;
                                                                if (!vol || vol === 'Active' || vol === 'High') return vol || 'N/A';
                                                                const volNum = parseFloat(vol);
                                                                return isNaN(volNum)
                                                                    ? vol
                                                                    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(volNum);
                                                            })()}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.detailItem}>
                                                        <Text style={styles.detailLabel}>到期日 (End Date)</Text>
                                                        <Text style={styles.detailValue}>
                                                            {belief.marketEvent.endDate || '2025-12-31'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={{ marginBottom: 16 }}>
                                                    <Text style={styles.detailLabel}>預測問題 (Topic)</Text>
                                                    <Text style={[styles.detailValue, { fontSize: 13, lineHeight: 18 }]} numberOfLines={3}>
                                                        {belief.marketEvent.markets[0]?.question || belief.marketEvent.title}
                                                    </Text>
                                                </View>

                                                <View style={styles.outcomesContainer}>
                                                    <Text style={styles.detailLabel}>潛在結果 (Outcomes)</Text>
                                                    {belief.marketEvent.markets[0]?.outcomes?.map((outcome, idx) => {
                                                        const rawPrices = belief.marketEvent.markets[0].outcomePrices;
                                                        const prices = typeof rawPrices === 'string'
                                                            ? JSON.parse(rawPrices)
                                                            : rawPrices;
                                                        const outcomeProb = Math.round(parseFloat(prices[idx]) * 100);
                                                        return (
                                                            <View key={idx} style={styles.outcomeRow}>
                                                                <Text style={styles.outcomeText}>{outcome}</Text>
                                                                <Text style={styles.outcomeProb}>{outcomeProb}%</Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.viewMarketBtn}
                                                    onPress={() => {
                                                        if (typeof window !== 'undefined' && belief.marketEvent.sourceUrl) {
                                                            window.open(belief.marketEvent.sourceUrl, '_blank');
                                                        }
                                                    }}
                                                >
                                                    <Text style={styles.viewMarketText}>前往 {belief.marketEvent.source} 查看詳細</Text>
                                                    <Ionicons name="open-outline" size={14} color="#a1a1aa" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })
                    ) : (
                        <View style={styles.emptyTopics}>
                            <Text style={styles.emptyTopicsText}>尚未追蹤任何預測市場主題</Text>
                            <Text style={styles.emptyTopicsHint}>請在設定中選擇你關注的主題</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.footerVersion}>
                    Believer System V1.5 · Perception Only
                </Text>

                {/* BetalphaX Footer */}
                <View style={{ padding: 24, paddingBottom: 60, alignItems: 'center' }}>
                    <Text style={{ color: '#71717a', fontSize: 14, marginBottom: 20, textAlign: 'center', lineHeight: 24, letterSpacing: 0.5 }}>
                        紀錄下你的交易想法，累積長期交易紀律
                    </Text>

                    {/* Professional Button */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 24,
                            paddingVertical: 14,
                            backgroundColor: '#18181B',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#3F3F46',
                            gap: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                        }}
                        onPress={() => {
                            if (typeof window !== 'undefined') {
                                window.open('https://betalphax.vercel.app/', '_blank');
                            }
                        }}
                    >
                        <Image
                            source={require('@/assets/images/betalphax_logo.jpg')}
                            style={{ width: 20, height: 20, borderRadius: 4 }}
                        />
                        <Text style={{ color: '#F4F4F5', fontSize: 16, fontWeight: '600' }}>BetalphaX</Text>
                        <Ionicons name="arrow-forward" size={16} color="#71717A" />
                    </TouchableOpacity>

                    {/* Social Links */}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 32 }}>
                        <TouchableOpacity
                            style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: '#18181B',
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: '#27272A'
                            }}
                            onPress={() => {
                                if (typeof window !== 'undefined') {
                                    window.open('https://www.instagram.com/betalpha_news/', '_blank');
                                }
                            }}
                        >
                            <Ionicons name="logo-instagram" size={20} color="#A1A1AA" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: '#18181B',
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1, borderColor: '#27272A'
                            }}
                            onPress={() => {
                                if (typeof window !== 'undefined') {
                                    window.open('https://t.me/+BKg09wTOVGZhYzBl', '_blank');
                                }
                            }}
                        >
                            <FontAwesome name="telegram" size={18} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>

            {/* Notification Panel Overlay */}
            {
                showNotifications && (
                    <View style={styles.notificationOverlay}>
                        {/* Backdrop */}
                        <TouchableOpacity
                            style={styles.backdrop}
                            activeOpacity={1}
                            onPress={() => setShowNotifications(false)}
                        />
                        {/* Panel */}
                        <View style={styles.drawerPanel}>
                            <Text style={styles.drawerTitle}>通知中心</Text>
                            <View style={styles.notificationItem}>
                                <View style={styles.notifHeader}>
                                    <View style={[styles.dotSmall, { backgroundColor: '#3b82f6' }]} />
                                    <Text style={styles.notifType}>SYSTEM</Text>
                                </View>
                                <Text style={styles.notifContent}>歡迎使用 Believer 1.4。Liquidity 模組已上線。</Text>
                                <Text style={styles.notifTime}>15 mins ago</Text>
                            </View>
                            <View style={styles.notificationItem}>
                                <View style={styles.notifHeader}>
                                    <View style={[styles.dotSmall, { backgroundColor: '#f97316' }]} />
                                    <Text style={styles.notifType}>ALERT</Text>
                                </View>
                                <Text style={styles.notifContent}>反轉指數接近臨界值 (60)，請留意宏觀信號變化。</Text>
                                <Text style={styles.notifTime}>2 hours ago</Text>
                            </View>
                        </View>
                    </View>
                )
            }

            {/* Settings Dropdown */}
            {showSettings && (
                <>
                    {/* Backdrop to close */}
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                        activeOpacity={1}
                        onPress={() => setShowSettings(false)}
                    />
                    <View style={styles.settingsOverlay}>

                        {/* 1. Profile Section */}
                        <View style={[styles.settingsItem, { borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 16, marginBottom: 8 }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: '#71717a', fontSize: 10, marginBottom: 4 }}>DISPLAY NAME</Text>
                                {editingName ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TextInput
                                            value={tempName}
                                            onChangeText={setTempName}
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#27272a',
                                                color: 'white',
                                                padding: 4,
                                                borderRadius: 4,
                                                fontSize: 14
                                            }}
                                            autoFocus
                                        />
                                        <TouchableOpacity onPress={handleUpdateName}>
                                            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setEditingName(false)}>
                                            <Ionicons name="close-circle" size={20} color="#71717a" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                                            {user?.name || 'Believer'}
                                        </Text>
                                        <TouchableOpacity onPress={() => { setTempName(user?.name || ''); setEditingName(true); }}>
                                            <Ionicons name="pencil" size={14} color="#71717a" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* 2. Notification Settings */}
                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => setNotificationSetting('phaseTransitions', !notificationSettings?.phaseTransitions)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsItemText}>階段轉換通知</Text>
                            </View>
                            <Switch
                                value={notificationSettings?.phaseTransitions ?? true}
                                onValueChange={(v) => setNotificationSetting('phaseTransitions', v)}
                                trackColor={{ false: '#27272a', true: '#fb923c' }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => setNotificationSetting('newIndicators', !notificationSettings?.newIndicators)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsItemText}>新增追蹤指標</Text>
                            </View>
                            <Switch
                                value={notificationSettings?.newIndicators ?? true}
                                onValueChange={(v) => setNotificationSetting('newIndicators', v)}
                                trackColor={{ false: '#27272a', true: '#fb923c' }}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingsItem}
                            onPress={() => setNotificationSetting('extremeDynamics', !notificationSettings?.extremeDynamics)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingsItemText}>指標極端動態</Text>
                            </View>
                            <Switch
                                value={notificationSettings?.extremeDynamics ?? true}
                                onValueChange={(v) => setNotificationSetting('extremeDynamics', v)}
                                trackColor={{ false: '#27272a', true: '#fb923c' }}
                            />
                        </TouchableOpacity>

                        <View style={{ height: 1, backgroundColor: '#27272a', marginVertical: 8 }} />

                        <Text style={{ color: '#71717a', fontSize: 10, paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>ACCOUNT</Text>

                        <TouchableOpacity style={styles.settingsItem} onPress={() => {
                            // Reset all stores
                            resetProfile();
                            useOnboardingStore.getState().resetOnboarding();
                            setShowSettings(false);
                            router.replace('/onboarding');
                        }}>
                            <Ionicons name="refresh" size={16} color="#E4E4E7" />
                            <Text style={styles.settingsItemText}>重置偏好設定</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.settingsItem} onPress={logout}>
                            <Ionicons name="log-out" size={16} color="#ef4444" />
                            <Text style={[styles.settingsItemText, styles.settingsItemDanger]}>登出帳號</Text>
                        </TouchableOpacity>

                    </View>
                </>
            )}

            {/* Cyber Wooden Fish FAB */}
            <TouchableOpacity
                onPress={handleFishClick}
                style={styles.fishFabContainer}
            >
                {/* The Wooden Stick (Mallet) */}
                <Animated.View
                    style={[
                        styles.woodenStick,
                        {
                            transform: [
                                { translateX: 20 }, // Pivot adjust
                                { translateY: -20 },
                                {
                                    rotate: stickAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['-30deg', '15deg'] // Swing from -30 to 15
                                    })
                                },
                                { translateX: -20 }, // Pivot back
                                { translateY: 20 }
                            ]
                        }
                    ]}
                >
                    <View style={styles.stickHead} />
                    <View style={styles.stickHandle} />
                </Animated.View>

                <Animated.View style={[styles.fishFab, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.fishCounter}>
                        <Text style={styles.fishCountText}>{faithClicks}</Text>
                        <Text style={styles.fishLabelText}>功德</Text>
                    </View>
                    <View style={styles.fishIconBg}>
                        {/* Use Image instead of Icon */}
                        <Image
                            source={require('../assets/images/wooden-fish.png')}
                            style={{ width: 44, height: 44 }}
                            resizeMode="contain"
                        />
                    </View>
                    {/* Settings Button */}
                    <TouchableOpacity
                        style={styles.meritSettingsBtn}
                        onPress={() => setShowMeritModal(true)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="settings-sharp" size={12} color="#71717a" />
                    </TouchableOpacity>
                </Animated.View>
                {showMerit && (
                    <View style={styles.meritPopup}>
                        <Text style={styles.meritText}>功德 +1</Text>
                    </View>
                )}




            </TouchableOpacity>

            <MeritModal
                visible={showMeritModal}
                onClose={() => setShowMeritModal(false)}
                myMerit={faithClicks}
            />
        </SafeAreaView >
    );
}

// Merit Modal Component
function MeritModal({ visible, onClose, myMerit }: { visible: boolean, onClose: () => void, myMerit: number }) {
    const [tab, setTab] = useState<'personal' | 'rank'>('personal');
    const [stats, setStats] = useState({ total: 0 });
    const [leaderboard, setLeaderboard] = useState<{ id: string, displayName: string, merit: number }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setLoading(true);
            Promise.all([
                import('@/services/meritService').then(m => m.getGlobalMerit()),
                import('@/services/meritService').then(m => m.getLeaderboard())
            ]).then(([total, ranks]) => {
                setStats({ total });
                setLeaderboard(ranks);
                setLoading(false);
            });
        }
    }, [visible]);

    if (!visible) return null;

    const contribution = stats.total > 0 ? ((myMerit / stats.total) * 100).toFixed(4) : '0';

    return (
        <View style={styles.modalOverlay} onStartShouldSetResponder={() => true} onResponderRelease={onClose}>
            <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setTab('personal')} style={[styles.tabBtn, tab === 'personal' && styles.tabBtnActive]}>
                        <Text style={[styles.tabText, tab === 'personal' && styles.tabTextActive]}>我的功德</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTab('rank')} style={[styles.tabBtn, tab === 'rank' && styles.tabBtnActive]}>
                        <Text style={[styles.tabText, tab === 'rank' && styles.tabTextActive]}>功德榜</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={20} color="#71717a" />
                    </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                    {loading ? (
                        <Text style={{ color: '#71717a', textAlign: 'center', marginTop: 20 }}>載入中...</Text>
                    ) : tab === 'personal' ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <Text style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 8 }}>你已經為牛市回歸貢獻了</Text>
                            <Text style={{ color: '#fb923c', fontSize: 32, fontWeight: 'bold', marginBottom: 4 }}>{myMerit}</Text>
                            <Text style={{ color: '#71717a', fontSize: 12, marginBottom: 24 }}>({contribution}%) 的念力</Text>

                            <View style={{ height: 1, width: '100%', backgroundColor: '#27272a', marginBottom: 24 }} />

                            <Text style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 8 }}>目前所有用戶共捐獻了</Text>
                            <Text style={{ color: '#e4e4e7', fontSize: 24, fontWeight: '700' }}>{stats.total.toLocaleString()}</Text>
                            <Text style={{ color: '#71717a', fontSize: 12, marginTop: 4 }}>功德</Text>
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 300 }}>
                            {leaderboard.map((user, idx) => (
                                <View key={user.id} style={styles.rankRow}>
                                    <Text style={[styles.rankNum, idx < 3 && styles.rankTop]}>{idx + 1}</Text>
                                    <Text style={styles.rankName} numberOfLines={1}>{user.displayName}</Text>
                                    <Text style={styles.rankScore}>{user.merit.toLocaleString()}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        position: 'relative',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    headerBrand: {
        color: '#71717A', // zinc-500
        fontWeight: '700',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    notificationBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#18181B', // zinc-900
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A', // zinc-800
    },
    notificationIconWrapper: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        backgroundColor: '#EF4444', // red-500
        borderRadius: 999,
    },
    marketAnchor: {
        alignItems: 'center',
        marginBottom: 32,
        paddingTop: 16,
    },
    anchorLabel: {
        color: '#71717A',
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
    },
    anchorValue: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: -1,
    },
    anchorStats: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    statText: {
        color: '#52525B', // zinc-600
        fontSize: 12,
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#18181B', // zinc-900
        borderRadius: 24, // rounded-3xl
        padding: 32, // p-8
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#27272A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardHeaderLabel: {
        color: '#A1A1AA', // zinc-400
        fontWeight: '700',
        textTransform: 'uppercase',
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 4,
    },
    cardHeaderTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusBadgeActive: {
        backgroundColor: 'rgba(124, 45, 18, 0.3)', // orange-900/30
        borderColor: 'rgba(249, 115, 22, 0.5)', // orange-500/50
    },
    statusBadgeNeutral: {
        backgroundColor: '#27272A',
        borderColor: '#3F3F46',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    textOrange: { color: '#FB923C' }, // orange-400
    textZinc: { color: '#A1A1AA' }, // zinc-400
    textZincLight: { color: '#E4E4E7' }, // zinc-200
    indexMeter: {
        alignItems: 'center',
        marginVertical: 24,
    },
    indexValue: {
        fontSize: 96, // text-8xl
        fontWeight: '900',
    },
    btcChange: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    barContainer: {
        width: '100%',
        flexDirection: 'row',
        gap: 4,
        marginTop: 24,
    },
    barLeft: {
        flex: 1,
        height: 6,
        backgroundColor: '#27272A',
        borderTopLeftRadius: 999,
        borderBottomLeftRadius: 999,
        overflow: 'hidden',
    },
    barRight: {
        flex: 1,
        height: 6,
        backgroundColor: '#27272A',
        borderTopRightRadius: 999,
        borderBottomRightRadius: 999,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
    },
    barLabels: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        marginBottom: 16,
    },
    barLabelText: {
        color: '#52525B', // zinc-600
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    liquidityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(39, 39, 42, 0.5)', // zinc-800/50
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    liquidityText: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    interpretationBox: {
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 16,
        marginTop: 8,
    },
    interpretationLabel: {
        color: '#71717A', // zinc-500
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    interpretationText: {
        color: '#D4D4D8', // zinc-300
        fontSize: 14,
        lineHeight: 24,
    },
    sectionTitle: {
        color: '#71717A',
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
    },
    categoryCard: {
        backgroundColor: '#18181B', // zinc-900
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 20,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    techIconBg: {
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    categoryTitle: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    categorySubtitle: {
        color: '#71717A',
        fontSize: 12,
    },
    accordionContainer: {
        marginBottom: 12,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 12,
        overflow: 'hidden',
    },
    accordionHeader: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#18181B',
    },
    accordionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    dotActive: { backgroundColor: '#F97316' }, // orange-500
    dotInactive: { backgroundColor: '#3F3F46' }, // zinc-700
    accordionTitle: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    accordionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accordionCount: {
        color: '#71717A',
        fontWeight: '700',
        fontSize: 12,
    },
    accordionBody: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(39, 39, 42, 0.5)',
        padding: 8,
    },
    beliefItem: {
        padding: 12,
        marginBottom: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
    },
    beliefTitle: {
        color: '#D4D4D8', // zinc-300
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    probabilityTrack: {
        width: 48,
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 999,
    },
    probabilityFill: {
        height: '100%',
        backgroundColor: '#71717A', // zinc-500
        borderRadius: 999,
    },
    addSignalBtn: {
        marginTop: 8,
        paddingVertical: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#3F3F46', // zinc-700
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    addSignalText: {
        color: '#A1A1AA', // zinc-400
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    footerVersion: {
        color: '#3F3F46', // zinc-700
        textAlign: 'center',
        marginTop: 48,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    notificationOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        flexDirection: 'row',
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    drawerPanel: {
        width: '80%',
        backgroundColor: '#18181B',
        height: '100%',
        borderLeftWidth: 1,
        borderLeftColor: '#27272A',
        paddingTop: 64,
        paddingHorizontal: 24,
        shadowColor: '#000',
        shadowOffset: { width: -5, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    drawerTitle: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 20, // text-xl
        marginBottom: 24,
    },
    notificationItem: {
        backgroundColor: 'rgba(39, 39, 42, 0.5)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 8,
    },
    notifHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    dotSmall: {
        width: 6,
        height: 6,
        borderRadius: 999,
    },
    notifType: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    notifContent: {
        color: '#E4E4E7',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 8,
    },
    notifTime: {
        color: '#71717A',
        fontSize: 10,
    },
    fishFabContainer: {
        position: 'absolute',
        bottom: 32,
        right: 24,
        zIndex: 40,
    },
    fishFab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(24, 24, 27, 0.95)', // Increased opacity
        padding: 4, // Tighter padding for "card" look
        paddingLeft: 24, // Text on left needs padding
        paddingRight: 6, // Fish on right needs less padding
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#F59E0B',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    woodenStick: {
        position: 'absolute',
        top: -24,
        right: -10,
        zIndex: 50, // Above the fish
        alignItems: 'center',
    },
    stickHead: {
        width: 12,
        height: 24,
        backgroundColor: '#78350F', // Dark Wood
        borderRadius: 6,
        marginBottom: -4,
        zIndex: 2,
    },
    stickHandle: {
        width: 6,
        height: 48,
        backgroundColor: '#92400E', // Lighter Wood
        borderRadius: 3,
    },
    fishIconBg: {
        width: 56,
        height: 56,
        borderRadius: 28, // Circle
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16, // Spacing between Text and Fish
    },
    fishCounter: {
        alignItems: 'flex-end', // Align text to right (towards fish) or center? Let's use flex-end to make number align right next to fish
    },
    fishCountText: {
        color: '#F59E0B',
        fontSize: 24, // Larger font
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
        lineHeight: 28,
        textShadowColor: 'rgba(245, 158, 11, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    fishLabelText: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    meritPopup: {
        position: 'absolute',
        bottom: 150,
        right: 40,
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 110,
    },
    meritText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    progressSection: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 20,
    },
    progressLabel: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    progressBar: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 8,
    },
    progressBlock: {
        flex: 1,
        height: 8,
        backgroundColor: '#27272A',
        borderRadius: 2,
    },
    progressBlockFilled: {
        backgroundColor: '#22c55e',
    },
    progressStatus: {
        color: '#A1A1AA',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 16,
    },
    progressContext: {
        backgroundColor: '#0c0c0f',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1f1f22',
    },
    contextTitle: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    contextItem: {
        color: '#52525B',
        fontSize: 13,
        lineHeight: 22,
    },

    // V2: Market Dynamics Styles
    dynamicsBox: {
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 20,
    },
    dynamicsLabel: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    dynamicItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1f1f22',
    },
    dynamicChange: {
        color: '#E4E4E7',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    dynamicInterpret: {
        color: '#71717A',
        fontSize: 13,
        marginLeft: 12,
        marginBottom: 2,
    },
    dynamicImpact: {
        color: '#52525B',
        fontSize: 13,
        marginLeft: 12,
        fontStyle: 'italic',
    },
    // Topic Cards for Market Expectations
    topicCard: {
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    topicCardExpanded: {
        backgroundColor: '#27272A',
        borderColor: '#3F3F46',
    },
    topicHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topicDetails: {
        padding: 16,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: '#3F3F46',
        marginTop: 0,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 16,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        color: '#71717a',
        fontSize: 12,
        marginBottom: 4,
    },
    detailValue: {
        color: '#E4E4E7',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    outcomesContainer: {
        marginBottom: 16,
    },
    outcomeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    outcomeText: {
        color: '#D4D4D8',
        fontSize: 14,
    },
    outcomeProb: {
        color: '#E4E4E7',
        fontSize: 14,
        fontWeight: '600',
    },
    viewMarketBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        backgroundColor: '#3F3F46',
        borderRadius: 8,
    },
    viewMarketText: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '500',
    },
    topicLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    topicDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    topicInfo: {
        flex: 1,
    },
    topicTitle: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 2,
    },
    topicDesc: {
        color: '#71717A',
        fontSize: 12,
    },
    topicRight: {
        alignItems: 'flex-end',
    },
    topicProb: {
        fontSize: 18,
        fontWeight: '700',
    },
    topicSource: {
        color: '#52525b',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    emptyTopics: {
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderStyle: 'dashed',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyTopicsText: {
        color: '#71717A',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptyTopicsHint: {
        color: '#52525b',
        fontSize: 12,
    },
    // Settings Menu Styles
    settingsOverlay: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 100,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 12,
        padding: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    settingsItemText: {
        color: '#E4E4E7',
        fontSize: 14,
        fontWeight: '500',
    },
    settingsItemDanger: {
        color: '#ef4444',
    },
    // Merit Modal Styles
    meritSettingsBtn: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#3f3f46',
        zIndex: 101,
    },

    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#09090b', // Full screen dark background
        zIndex: 1000,
        paddingTop: Platform.OS === 'ios' ? 50 : 20, // SafeArea
    },
    modalContent: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 0,
        borderWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
        paddingHorizontal: 16,
        paddingBottom: 8,
        alignItems: 'center',
    },
    tabBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 16,
    },
    tabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#fb923c',
    },
    tabText: {
        color: '#71717a',
        fontSize: 18, // Larger text for full screen
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#fb923c',
    },
    closeBtn: {
        marginLeft: 'auto',
        padding: 8,
        backgroundColor: '#27272a',
        borderRadius: 20,
    },
    modalBody: {
        padding: 24,
    },
    rankRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
    },
    rankNum: {
        width: 30,
        color: '#71717a',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rankTop: {
        color: '#fb923c',
    },
    rankName: {
        flex: 1,
        color: '#e4e4e7',
        fontSize: 14,
    },
    rankScore: {
        color: '#fb923c',
        fontWeight: '600',
        fontSize: 14,
    },
});
