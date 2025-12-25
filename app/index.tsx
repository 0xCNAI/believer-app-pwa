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

    // 1. BTC Price Polling (Mock 10s)
    useEffect(() => {
        const interval = setInterval(() => {
            const volatility = (Math.random() - 0.5) * 50;
            setBtcPrice(btcPrice + volatility);
        }, 10000);
        return () => clearInterval(interval);
    }, [btcPrice]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1500);
    };

    const openMoment = (category?: string) => {
        // In real implementation we'd pass category param
        router.push({ pathname: "/moment", params: { category } });
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
                {/* V1 Header: BTC Anchor */}
                <View style={styles.marketAnchor}>
                    <Text style={styles.anchorLabel}>市場錨點 (Market Anchor)</Text>
                    <Text style={styles.anchorValue}>BTC ${roundedPrice}</Text>
                    <View style={styles.anchorStats}>
                        <Text style={styles.statText}>+2.4% (7天)</Text>
                        <Text style={styles.statText}>成交量: 低</Text>
                    </View>
                </View>

                {/* Core Metric: Reversal Index */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardHeaderLabel}>Reversal Index</Text>
                            <Text style={styles.cardHeaderTitle}>反轉指數</Text>
                        </View>
                        <View style={[styles.statusBadge, reversalIndex > 50 ? styles.statusBadgeActive : styles.statusBadgeNeutral]}>
                            <Text style={[styles.statusText, reversalIndex > 50 ? styles.textOrange : styles.textZinc]}>
                                {reversalIndex > 50 ? '活躍' : '中性'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.indexMeter}>
                        <Text style={[styles.indexValue, reversalIndex > 60 ? styles.textOrange : styles.textZincLight]}>
                            {reversalIndex.toFixed(0)}
                        </Text>

                        {/* Visual Attribution */}
                        <View style={styles.barContainer}>
                            <View style={styles.barLeft}>
                                <View style={[styles.barFill, { width: '60%', backgroundColor: 'rgba(59, 130, 246, 0.4)' }]} />
                            </View>
                            <View style={styles.barRight}>
                                <View style={[styles.barFill, { width: '40%', backgroundColor: 'rgba(249, 115, 22, 0.4)' }]} />
                            </View>
                        </View>
                        <View style={styles.barLabels}>
                            <Text style={styles.barLabelText}>60% 技術基礎</Text>
                            <Text style={styles.barLabelText}>40% 用戶信念</Text>
                        </View>

                        {/* Liquidity Amplifier Badge */}
                        <View style={styles.liquidityBadge}>
                            <Ionicons name="water" size={12} color="#71717a" />
                            <Text style={styles.liquidityText}>
                                流動性狀態: 中性
                            </Text>
                        </View>
                    </View>

                    {/* Neutral Interpretation */}
                    <View style={styles.interpretationBox}>
                        <Text style={styles.interpretationLabel}>趨勢感知</Text>
                        <Text style={styles.interpretationText}>
                            {interpretation}
                        </Text>
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
                                            onPress={() => openMoment(cat)}
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
});
