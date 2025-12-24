import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useBeliefStore } from '@/stores/beliefStore';
import { Ionicons } from '@expo/vector-icons';

export default function FeedsScreen() {
    const { beliefs } = useBeliefStore();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>動態 (Feeds)</Text>
                    <TouchableOpacity>
                        <Ionicons name="filter" size={20} color="#52525b" />
                    </TouchableOpacity>
                </View>

                {beliefs.length > 0 ? (
                    beliefs.map(belief => (
                        <View key={belief.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{belief.marketEvent.category}</Text>
                                </View>
                                <Text style={styles.timeText}>Just now</Text>
                            </View>

                            <Text style={styles.cardTitle}>
                                {belief.marketEvent.title}
                            </Text>

                            <View style={styles.cardFooter}>
                                <Text style={styles.sourceText}>
                                    {belief.marketEvent.source}
                                </Text>
                                <Text style={styles.statusText}>
                                    State Change: Active
                                </Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="newspaper-outline" size={48} color="#52525b" />
                        <Text style={styles.emptyText}>尚無關注動態</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 30, // text-3xl
        fontWeight: '900', // font-black
    },
    card: {
        marginBottom: 24,
        backgroundColor: '#18181b', // zinc-900
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    categoryBadge: {
        backgroundColor: '#27272a', // zinc-800
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    categoryText: {
        color: '#a1a1aa', // zinc-400
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    timeText: {
        color: '#71717a', // zinc-500
        fontSize: 12,
    },
    cardTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18, // text-lg
        marginBottom: 4,
        lineHeight: 24,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(39, 39, 42, 0.5)', // zinc-800/50
    },
    sourceText: {
        color: '#71717a', // zinc-500
        fontSize: 12,
    },
    statusText: {
        color: '#fb923c', // orange-400
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        opacity: 0.5,
    },
    emptyText: {
        color: '#71717a', // zinc-500
        marginTop: 16,
        fontWeight: 'bold',
    },
});
