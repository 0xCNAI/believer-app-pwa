import { BELIEVER_SIGNALS, EventCategory, MarketEvent } from '@/services/marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Source 類型定義
type SourceGroup = 'official' | 'prediction' | 'market' | 'onchain' | 'news';

const SOURCE_GROUPS: Record<SourceGroup, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    official: { label: '📡 官方數據', icon: 'globe-outline', color: '#3b82f6' },
    prediction: { label: '🎯 預測市場', icon: 'analytics-outline', color: '#8b5cf6' },
    market: { label: '📊 市場數據', icon: 'bar-chart-outline', color: '#22c55e' },
    onchain: { label: '⛓ 鏈上數據', icon: 'link-outline', color: '#f59e0b' },
    news: { label: '📰 新聞/事件', icon: 'newspaper-outline', color: '#ef4444' },
};

// 將 source 映射到分組
function getSourceGroup(source: string): SourceGroup {
    const s = source.toLowerCase();
    if (s.includes('polymarket') || s.includes('kalshi') || s.includes('prediction')) return 'prediction';
    if (s.includes('central bank') || s.includes('official') || s.includes('fed') || s.includes('bond')) return 'official';
    if (s.includes('on-chain') || s.includes('onchain')) return 'onchain';
    if (s.includes('market') || s.includes('options') || s.includes('dxy') || s.includes('etf')) return 'market';
    return 'news';
}

// 獲取事件機率
const getEventProbability = (event: MarketEvent): number => {
    try {
        if (!event.markets || event.markets.length === 0) return 0.5;
        const prices = JSON.parse(event.markets[0].outcomePrices as any);
        return parseFloat(prices[0]) || 0.5;
    } catch (e) {
        return 0.5;
    }
};

// 分類名稱映射
const catNameMap: Record<string, string> = {
    'Macro': '宏觀趨勢',
    'Liquidity': '流動性',
    'Risk': '市場風險',
    'Supply': '籌碼結構',
    'Political': '政治與監管',
    'Narrative': '敘事轉向'
};

export default function SignalsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const category = params.category as EventCategory;
    const { hasInteracted } = useBeliefStore();

    // 篩選並分組信號
    const groupedSignals = useMemo(() => {
        const signals = BELIEVER_SIGNALS.filter(s => s.category === category);

        const groups: Record<SourceGroup, MarketEvent[]> = {
            official: [],
            prediction: [],
            market: [],
            onchain: [],
            news: [],
        };

        signals.forEach(signal => {
            const group = getSourceGroup(signal.source || '');
            groups[group].push(signal);
        });

        // 只返回有信號的分組
        return Object.entries(groups)
            .filter(([_, signals]) => signals.length > 0)
            .map(([key, signals]) => ({
                key: key as SourceGroup,
                ...SOURCE_GROUPS[key as SourceGroup],
                signals,
            }));
    }, [category]);

    const totalSignals = groupedSignals.reduce((sum, g) => sum + g.signals.length, 0);

    const openSignalDetail = (signalId: string) => {
        router.push({ pathname: '/moment', params: { signalId } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{catNameMap[category] || category}</Text>
                    <Text style={styles.headerSubtitle}>{totalSignals} 個信號</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 60 }}>
                {groupedSignals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="radio-outline" size={48} color="#52525b" />
                        <Text style={styles.emptyText}>此分類暫無信號</Text>
                    </View>
                ) : (
                    groupedSignals.map(group => (
                        <View key={group.key} style={styles.groupSection}>
                            {/* Group Header */}
                            <View style={styles.groupHeader}>
                                <View style={[styles.groupIcon, { backgroundColor: group.color + '20' }]}>
                                    <Ionicons name={group.icon} size={16} color={group.color} />
                                </View>
                                <Text style={styles.groupLabel}>{group.label}</Text>
                                <Text style={styles.groupCount}>{group.signals.length}</Text>
                            </View>

                            {/* Signal List */}
                            {group.signals.map(signal => {
                                const prob = getEventProbability(signal);
                                const isTracked = hasInteracted(signal.id);

                                return (
                                    <TouchableOpacity
                                        key={signal.id}
                                        style={[styles.signalCard, isTracked && styles.signalCardTracked]}
                                        onPress={() => openSignalDetail(signal.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.signalMain}>
                                            <Text style={styles.signalTitle}>{signal.title}</Text>
                                            <Text style={styles.signalDesc} numberOfLines={1}>
                                                {signal.description}
                                            </Text>
                                        </View>
                                        <View style={styles.signalRight}>
                                            <Text style={[
                                                styles.signalProb,
                                                prob >= 0.6 && styles.probHigh,
                                                prob <= 0.4 && styles.probLow,
                                            ]}>
                                                {Math.round(prob * 100)}%
                                            </Text>
                                            {isTracked && (
                                                <View style={styles.trackedBadge}>
                                                    <Ionicons name="checkmark" size={10} color="#22c55e" />
                                                </View>
                                            )}
                                            <Ionicons name="chevron-forward" size={16} color="#52525b" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))
                )}
            </ScrollView>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fafafa',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#71717a',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        color: '#52525b',
        fontSize: 14,
        marginTop: 12,
    },

    // Group Section
    groupSection: {
        marginBottom: 24,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    groupIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#a1a1aa',
    },
    groupCount: {
        fontSize: 12,
        color: '#52525b',
        backgroundColor: '#27272a',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },

    // Signal Card
    signalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    signalCardTracked: {
        borderColor: '#22c55e30',
        backgroundColor: '#18181b',
    },
    signalMain: {
        flex: 1,
        marginRight: 12,
    },
    signalTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fafafa',
        marginBottom: 4,
    },
    signalDesc: {
        fontSize: 12,
        color: '#71717a',
    },
    signalRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    signalProb: {
        fontSize: 16,
        fontWeight: '700',
        color: '#a1a1aa',
    },
    probHigh: {
        color: '#22c55e',
    },
    probLow: {
        color: '#ef4444',
    },
    trackedBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#22c55e20',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
