import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useBeliefStore } from '@/stores/beliefStore';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function TrackingScreen() {
    const { beliefs, removeBelief } = useBeliefStore();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [pushThreshold, setPushThreshold] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>TRACKING</Text>
                <Text style={styles.headerSubtitle}>你的觀察清單 (Watchlist)</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

                {/* Notification Settings */}
                <View style={styles.settingsCard}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="notifications" size={20} color="#A1A1AA" />
                            <Text style={styles.settingLabel}>反轉警報設定</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#3f3f46', true: '#22c55e' }}
                        />
                    </View>

                    {notificationsEnabled && (
                        <View style={styles.subSettingsContainer}>
                            <View style={styles.subSettingRow}>
                                <Text style={styles.subSettingLabel}>反轉發生時 (大於 50%) 通知</Text>
                                <Switch
                                    value={true}
                                    disabled
                                    trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                                    style={styles.switchScale}
                                />
                            </View>
                            <View style={styles.subSettingRow}>
                                <Text style={styles.subSettingLabel}>高波動異常通知</Text>
                                <Switch
                                    value={pushThreshold}
                                    onValueChange={setPushThreshold}
                                    trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                                    style={styles.switchScale}
                                />
                            </View>
                        </View>
                    )}
                </View>

                {/* Beliefs List */}
                <View style={styles.listContainer}>
                    {beliefs.length === 0 ? (
                        <Text style={styles.emptyText}>
                            列表是空的。{'\n'}快去尋找值得相信的趨勢吧。
                        </Text>
                    ) : (
                        beliefs.map((belief) => {
                            const price = (belief.currentProbability || 0);
                            const delta = belief.currentProbability - belief.initialProbability;

                            // Calculate Reversal Contribution (0-100% prob maps to 0-40 points roughly)
                            const contribution = (price / 100) * 40;

                            return (
                                <View key={belief.id} style={styles.card}>
                                    {/* Background Decor */}
                                    <View style={styles.cardDecor} />

                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardHeaderLeft}>
                                            <View style={styles.cardTags}>
                                                <Text style={styles.categoryTag}>{belief.marketEvent.category}</Text>
                                                <Text style={styles.sourceTag}>{belief.marketEvent.source}</Text>
                                            </View>
                                            <Text style={styles.cardTitle} numberOfLines={2}>
                                                {belief.marketEvent.title}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeBelief(belief.id)} style={styles.closeButton}>
                                            <Ionicons name="close" size={20} color="#52525b" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <View>
                                            <Text style={styles.impactLabel}>Impact (影響力)</Text>
                                            <Text style={styles.impactValue}>
                                                +{contribution.toFixed(1)} <Text style={styles.ptsText}>pts</Text>
                                            </Text>
                                        </View>

                                        <View style={styles.probabilityContainer}>
                                            <Text style={styles.probabilityLabel}>Probability</Text>
                                            <Text style={[
                                                styles.probabilityValue,
                                                price > 50 ? styles.textGreen : styles.textZinc
                                            ]}>
                                                {price.toFixed(0)}%
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 30, // text-3xl
        fontWeight: '900', // font-black
        fontStyle: 'italic',
    },
    headerSubtitle: {
        color: '#71717a', // zinc-500
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 3, // tracking-widest
        fontSize: 12,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    settingsCard: {
        marginHorizontal: 24,
        marginTop: 24,
        marginBottom: 32,
        backgroundColor: '#18181b', // zinc-900
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingLabel: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16, // text-base
    },
    subSettingsContainer: {
        borderTopWidth: 1,
        borderTopColor: '#27272a', // zinc-800
        paddingTop: 16,
    },
    subSettingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    subSettingLabel: {
        color: '#a1a1aa', // zinc-400
        fontSize: 14, // text-sm
    },
    switchScale: {
        transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    },
    listContainer: {
        paddingHorizontal: 24,
    },
    emptyText: {
        color: '#52525b', // zinc-600
        textAlign: 'center',
        marginTop: 40,
        fontSize: 18, // text-lg
    },
    card: {
        backgroundColor: '#18181b', // zinc-900
        marginBottom: 16,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
        position: 'relative',
        overflow: 'hidden',
    },
    cardDecor: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 80,
        height: 80,
        backgroundColor: 'rgba(39, 39, 42, 0.2)', // zinc-800/20
        borderBottomLeftRadius: 100, // rounded-bl-full
        marginRight: -16,
        marginTop: -16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardHeaderLeft: {
        flex: 1,
        marginRight: 16,
    },
    cardTags: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryTag: {
        color: '#f97316', // orange-500
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2, // tracking-widest
        marginRight: 8,
    },
    sourceTag: {
        color: '#52525b', // zinc-600
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    cardTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18, // text-lg
        lineHeight: 24,
    },
    closeButton: {
        padding: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(39, 39, 42, 0.5)', // zinc-800/50
        paddingTop: 16,
    },
    impactLabel: {
        color: '#71717a', // zinc-500
        fontSize: 12, // text-xs
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    impactValue: {
        fontSize: 20, // text-xl
        fontWeight: '900', // font-black
        color: '#fff',
    },
    ptsText: {
        fontSize: 12, // text-xs
        fontWeight: 'normal',
        color: '#71717a', // zinc-500
    },
    probabilityContainer: {
        alignItems: 'flex-end',
    },
    probabilityLabel: {
        color: '#71717a', // zinc-500
        fontSize: 12, // text-xs
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    probabilityValue: {
        fontSize: 20, // text-xl
        fontWeight: 'bold',
    },
    textGreen: {
        color: '#4ade80', // green-400
    },
    textZinc: {
        color: '#d4d4d8', // zinc-300
    },
});
