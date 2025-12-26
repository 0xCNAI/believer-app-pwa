import { fetchUnifiedMarkets, MarketEvent } from '@/services/marketData';
import { useBeliefStore } from '@/stores/beliefStore';
import { useUserStore } from '@/stores/userStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

const { width } = Dimensions.get('window');

const getEventProbability = (event: MarketEvent): number => {
    try {
        if (!event.markets || event.markets.length === 0) return 0.5;
        // Mock data has outcomePrices as a JSON string inside the object, treating it loosely here
        const prices = JSON.parse(event.markets[0].outcomePrices as any);
        return parseFloat(prices[0]) || 0.5;
    } catch (e) {
        return 0.5;
    }
};

export default function MomentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const categoryFilter = params.category as string | undefined;
    const signalId = params.signalId as string | undefined; // NEW: Support single signal mode

    // Get User Preferences
    const { experience, focusAreas } = useUserStore();

    const [currentEvent, setCurrentEvent] = useState<MarketEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [singleMode, setSingleMode] = useState(false); // Track if in single signal mode
    const { addBelief, discardEvent, hasInteracted } = useBeliefStore();

    const loadNextEvent = async () => {
        setLoading(true);
        const data = await fetchUnifiedMarkets(experience, focusAreas);

        // Single signal mode: load specific signal by ID
        if (signalId) {
            const signal = data.find(e => e.id === signalId);
            setSingleMode(true);
            setCurrentEvent(signal || null);
            setLoading(false);
            return;
        }

        // Category filter mode: iterate through uninteracted signals
        let filteredData = data;
        if (categoryFilter) {
            filteredData = data.filter(e => e.category === categoryFilter);
        }

        const next = filteredData.find(e => !hasInteracted(e.id));
        if (next) {
            setCurrentEvent(next);
        } else {
            setCurrentEvent(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadNextEvent();
    }, [categoryFilter, signalId]);

    const handleSwipeLeft = () => {
        if (!currentEvent) return;
        discardEvent(currentEvent.id);
        // In single mode, go back; in category mode, load next
        if (singleMode) {
            router.back();
        } else {
            loadNextEvent();
        }
    };

    const handleSwipeRight = () => {
        if (!currentEvent) return;
        addBelief(currentEvent);
        router.back();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Scanning Network...</Text>
            </View>
        );
    }

    if (!currentEvent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="checkmark-circle-outline" size={64} color="#52525b" />
                    <Text style={styles.emptyTitle}>In Sync</Text>
                    <Text style={styles.emptySubtitle}>
                        {categoryFilter
                            ? `No new ${categoryFilter} signals detected.`
                            : "No new signals in the chaos."}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>Return to Core</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Signal Intercept</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View
                    key={currentEvent.id}
                    style={styles.card}
                >
                    {/* Category Label */}
                    <View style={styles.cardHeader}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{currentEvent.category}</Text>
                        </View>
                        <Text style={styles.sourceText}>{currentEvent.source}</Text>
                    </View>

                    {/* Main Title */}
                    <Text style={styles.eventTitle}>{currentEvent.title}</Text>

                    {/* Description */}
                    <Text style={styles.eventDescription}>{currentEvent.description}</Text>

                    {/* Stats Grid - only for prediction markets */}
                    {currentEvent.markets && currentEvent.markets.length > 0 ? (
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>市場共識</Text>
                                <Text style={styles.statValue}>{(getEventProbability(currentEvent) * 100).toFixed(0)}%</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>市場問題</Text>
                                <Text style={[styles.statValue, { fontSize: 12 }]} numberOfLines={2}>
                                    {currentEvent.markets[0]?.question || '-'}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.sourceInfo}>
                            <Text style={styles.sourceLabel}>數據來源</Text>
                            <Text style={styles.sourceName}>{currentEvent.source}</Text>
                            {currentEvent.sourceUrl && (
                                <Text style={styles.sourceUrl}>{currentEvent.sourceUrl}</Text>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.actionContainer}>
                <TouchableOpacity
                    onPress={handleSwipeLeft}
                    style={[styles.actionButton, styles.ignoreButton]}
                >
                    <Ionicons name="close" size={32} color="#ef4444" />
                    <Text style={[styles.actionText, styles.ignoreText]}>IGNORE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSwipeRight}
                    style={[styles.actionButton, styles.trackButton]}
                >
                    <Ionicons name="add" size={32} color="#000" />
                    <Text style={[styles.actionText, styles.trackText]}>TRACK</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#52525b', // zinc-600
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    emptySubtitle: {
        color: '#52525b', // zinc-600
        fontSize: 14,
        textAlign: 'center',
    },
    backButton: {
        marginTop: 32,
        backgroundColor: '#18181b', // zinc-900
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181b', // zinc-900
        borderRadius: 999,
    },
    headerTitle: {
        color: '#52525b', // zinc-600
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#18181b', // zinc-900
        borderRadius: 32,
        padding: 32,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
        minHeight: 400,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    categoryBadge: {
        backgroundColor: '#27272a', // zinc-800
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#3f3f46', // zinc-700
    },
    categoryText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sourceText: {
        color: '#52525b', // zinc-600
        fontSize: 12,
        fontWeight: '700',
    },
    eventTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        lineHeight: 40,
        marginBottom: 16,
    },
    eventDescription: {
        color: '#a1a1aa', // zinc-400
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#27272a', // zinc-800
        paddingTop: 24,
    },
    statItem: {
        gap: 4,
    },
    statLabel: {
        color: '#52525b', // zinc-600
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    statValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    actionContainer: {
        flexDirection: 'row',
        padding: 24,
        gap: 16,
        paddingBottom: 48,
    },
    actionButton: {
        flex: 1,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    ignoreButton: {
        backgroundColor: '#18181b', // zinc-900
        borderWidth: 1,
        borderColor: '#ef4444', // red-500
    },
    ignoreText: {
        color: '#ef4444', // red-500
    },
    trackButton: {
        backgroundColor: '#fff',
    },
    trackText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    sourceInfo: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
    },
    sourceLabel: {
        fontSize: 12,
        color: '#71717a',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    sourceName: {
        fontSize: 18,
        color: '#fafafa',
        fontWeight: '700',
        marginBottom: 8,
    },
    sourceUrl: {
        fontSize: 12,
        color: '#3b82f6',
        marginTop: 4,
    },
});
