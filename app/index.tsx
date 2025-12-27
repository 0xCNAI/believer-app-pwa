import { EventCategory } from '@/services/marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
    const router = useRouter();
    const { getReversalIndex, getInterpretation, btcPrice, setBtcPrice, beliefs } = useBeliefStore();
    const reversalIndex = getReversalIndex();
    const interpretation = getInterpretation();
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [btc24hChange, setBtc24hChange] = useState<number | null>(null);

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
                const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
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

    const categories: EventCategory[] = ['Macro', 'Liquidity', 'Risk', 'Supply', 'Political', 'Narrative'];

    const toggleExpand = (cat: string) => {
        setExpandedCat(expandedCat === cat ? null : cat);
    }

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
                    onPress={async () => {
                        await require('@/stores/authStore').useAuthStore.getState().logout();
                        router.replace('/login');
                    }}
                    style={[styles.notificationBtn, { marginLeft: 8, borderColor: '#3f3f46' }]}
                >
                    <Ionicons name="log-out-outline" size={18} color="#71717a" />
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
                        <Text style={[styles.indexValue, { color: '#22c55e' }]}>
                            {reversalIndex.toFixed(0)}
                        </Text>

                        {/* Dual-Track Sub-scores */}
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
                    </View>

                    {/* V2: Reversal Stage Display */}
                    <View style={styles.progressSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={styles.progressLabel}>目前階段</Text>
                            {(() => {
                                try {
                                    const { reversalState } = require('@/stores/techStore').useTechStore();
                                    const stage = reversalState?.stage || 'Bottom Break';
                                    const map: any = { 'Bottom Break': '破底 (Bottom Break)', 'Watch': '觀察 (Watch)', 'Prepare': '準備 (Prepare)', 'Confirmed': '確認 (Confirmed)' };

                                    // Veto Badge
                                    if (reversalState?.veto) {
                                        return (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                                                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>VETO ACTIVE</Text>
                                                </View>
                                                <Text style={{ color: '#E4E4E7', fontSize: 14, fontWeight: '700' }}>{map[stage]}</Text>
                                            </View>
                                        );
                                    }
                                    return <Text style={{ color: '#E4E4E7', fontSize: 14, fontWeight: '700' }}>{map[stage]}</Text>;
                                } catch (e) { return <Text style={{ color: '#71717A' }}>Loading...</Text>; }
                            })()}
                        </View>

                        {/* Dynamic Progress Bar based on Score (Visual Only) */}
                        <View style={styles.progressBar}>
                            {[...Array(8)].map((_, i) => {
                                // Maps roughly to 12.5 points per block
                                const filled = reversalIndex > (i * 12.5);
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.progressBlock,
                                            filled && styles.progressBlockFilled
                                        ]}
                                    />
                                );
                            })}
                        </View>

                        {/* Context Info */}
                        <View style={styles.progressContext}>
                            {(() => {
                                try {
                                    const { reversalState } = require('@/stores/techStore').useTechStore();
                                    if (!reversalState) return <Text style={styles.contextItem}>系統初始化中...</Text>;

                                    const { stage, veto, cycleZone, watchReason } = reversalState;

                                    if (veto) {
                                        return (
                                            <>
                                                <Text style={[styles.contextTitle, { color: '#ef4444' }]}>⚠️ 衍生品否決 (Overheated)</Text>
                                                <Text style={styles.contextItem}>• 資金費率或持倉量過熱 (Cap Active)</Text>
                                                <Text style={styles.contextItem}>• 上漲潛力受限，建議觀望</Text>
                                            </>
                                        );
                                    }

                                    if (stage === 'Bottom Break') {
                                        return (
                                            <>
                                                <Text style={styles.contextTitle}>尚未築底 (Bottom Break)</Text>
                                                <Text style={styles.contextItem}>• 鏈上週期信號：{cycleZone}</Text>
                                                <Text style={styles.contextItem}>• 技術結構偏弱，等待轉強</Text>
                                            </>
                                        );
                                    }

                                    if (stage === 'Watch') {
                                        return (
                                            <>
                                                <Text style={[styles.contextTitle, { color: '#f97316' }]}>進入觀察區 (Watch)</Text>
                                                <Text style={styles.contextItem}>• 觸發原因：{watchReason === 'ZONE_GUARANTEE' ? '強週期保底 (Strong Zone)' : '分數達標 (Score > 45)'}</Text>
                                                <Text style={styles.contextItem}>• 等待進一步確認信號</Text>
                                            </>
                                        );
                                    }

                                    return (
                                        <>
                                            <Text style={[styles.contextTitle, { color: '#22c55e' }]}>結構轉強 ({stage})</Text>
                                            <Text style={styles.contextItem}>• 趨勢與週期信號共振</Text>
                                            <Text style={styles.contextItem}>• 衍生品結構健康</Text>
                                        </>
                                    );

                                } catch (e) { return null; }
                            })()}
                        </View>
                    </View>

                    {/* V2: Market Dynamics (replaces 趨勢感知) */}
                    <View style={styles.dynamicsBox}>
                        <Text style={styles.dynamicsLabel}>市場動態（Market Dynamics）</Text>

                        <View style={styles.dynamicItem}>
                            <Text style={styles.dynamicChange}>• Open Interest 上升、價格下跌</Text>
                            <Text style={styles.dynamicInterpret}>→ 槓桿部位增加，市場仍在承壓</Text>
                            <Text style={styles.dynamicImpact}>→ 反轉可信度下降</Text>
                        </View>

                        <View style={styles.dynamicItem}>
                            <Text style={styles.dynamicChange}>• Funding Rate 回落至中性</Text>
                            <Text style={styles.dynamicInterpret}>→ 去槓桿進行中</Text>
                            <Text style={styles.dynamicImpact}>→ 有利於反轉準備階段</Text>
                        </View>

                        <View style={styles.dynamicItem}>
                            <Text style={styles.dynamicChange}>• 穩定幣供給近 30 日持平</Text>
                            <Text style={styles.dynamicInterpret}>→ 資金尚未進場</Text>
                            <Text style={styles.dynamicImpact}>→ 流動性不支持反轉加速</Text>
                        </View>
                    </View>
                </View>

                {/* Categories List */}
                <View>
                    <Text style={styles.sectionTitle}>信號分類</Text>

                    {/* Technical Special Category */}
                    <TouchableOpacity
                        onPress={openTechConfig}
                        style={styles.categoryCard}
                    >
                        <View style={styles.categoryHeader}>
                            <View style={styles.techIconBg}>
                                <Ionicons name="analytics" size={14} color="#3b82f6" />
                            </View>
                            <View>
                                <Text style={styles.categoryTitle}>技術趨勢</Text>
                                <Text style={styles.categorySubtitle}>BTC 價格結構與動能監測</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#52525b" />
                    </TouchableOpacity>

                    {/* Standard Categories */}
                    {categories.map((cat) => {
                        const catBeliefs = beliefs.filter(b => b.marketEvent.category === cat);
                        const isExpanded = expandedCat === cat;

                        // Category Name Translation
                        const catNameMap: Record<string, string> = {
                            'Macro': '宏觀趨勢',
                            'Liquidity': '流動性',
                            'Risk': '市場風險',
                            'Supply': '籌碼結構',
                            'Political': '政治與監管',
                            'Narrative': '敘事轉向'
                        };

                        return (
                            <View key={cat} style={styles.accordionContainer}>
                                <TouchableOpacity
                                    onPress={() => toggleExpand(cat)}
                                    style={styles.accordionHeader}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.accordionLeft}>
                                        {/* Visual Dot */}
                                        <View style={[styles.dot, catBeliefs.length > 0 ? styles.dotActive : styles.dotInactive]} />
                                        <Text style={styles.accordionTitle}>{catNameMap[cat] || cat}</Text>
                                    </View>
                                    <View style={styles.accordionRight}>
                                        <Text style={styles.accordionCount}>{catBeliefs.length} 活躍</Text>
                                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#52525b" />
                                    </View>
                                </TouchableOpacity>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <View style={styles.accordionBody}>
                                        {/* List of Active Beliefs in Cat */}
                                        {catBeliefs.map(b => (
                                            <View key={b.id} style={styles.beliefItem}>
                                                <Text style={styles.beliefTitle}>{b.marketEvent.title}</Text>
                                                <View style={styles.probabilityTrack}>
                                                    <View style={[styles.probabilityFill, { width: `${b.currentProbability}%` }]} />
                                                </View>
                                            </View>
                                        ))}

                                        {/* Add Button */}
                                        <TouchableOpacity
                                            onPress={() => openSignals(cat)}
                                            style={styles.addSignalBtn}
                                        >
                                            <Ionicons name="add" size={16} color="#a1a1aa" />
                                            <Text style={styles.addSignalText}>新增 {catNameMap[cat] || cat} 信號</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.footerVersion}>
                    Believer System V1.5 · Perception Only
                </Text>

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
        </SafeAreaView >
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
        marginBottom: 4,
    },
    dotSmall: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    notifType: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700',
    },
    notifContent: {
        color: '#E4E4E7', // zinc-200
        fontSize: 14,
    },
    notifTime: {
        color: '#52525B', // zinc-600
        fontSize: 10,
        marginTop: 8,
    },

    // V2: Progress Section Styles
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
});
