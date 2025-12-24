import { View, Text, TouchableOpacity, ScrollView, Switch, LayoutAnimation, Platform, UIManager, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TECH_CONDITIONS, TechCondition } from '@/constants/techConditions';
import { useState } from 'react';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TechConfigScreen() {
    const router = useRouter();
    const [activeConditions, setActiveConditions] = useState<Record<string, boolean>>({});
    const [expandedCondition, setExpandedCondition] = useState<string | null>(null);

    const toggleCondition = (id: string) => {
        setActiveConditions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCondition(expandedCondition === id ? null : id);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>技術趨勢配置</Text>
                    <Text style={styles.headerSubtitle}>Technical Configuration</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {TECH_CONDITIONS.map((condition) => {
                    const isActive = activeConditions[condition.id];
                    const isExpanded = expandedCondition === condition.id;

                    return (
                        <View key={condition.id} style={styles.card}>
                            <TouchableOpacity
                                onPress={() => toggleExpand(condition.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.cardLeft}>
                                        <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
                                        <View>
                                            <Text style={styles.conditionTitle}>{condition.title}</Text>
                                            <Text style={styles.conditionGroup}>{condition.group}</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={isActive}
                                        onValueChange={() => toggleCondition(condition.id)}
                                        trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                                        thumbColor={'#fff'}
                                    />
                                </View>

                                {/* Description */}
                                <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
                                    {condition.description}
                                </Text>

                                {isExpanded && (
                                    <View style={styles.expandedContent}>
                                        <View style={styles.divider} />
                                        <Text style={styles.expandedLabel}>觀察邏輯 (Observation Logic)</Text>
                                        <Text style={styles.expandedText}>{condition.explanation}</Text>

                                        <View style={styles.paramsContainer}>
                                            <Text style={styles.paramsLabel}>Default Parameters:</Text>
                                            <Text style={styles.paramsText}>
                                                {JSON.stringify(condition.defaultParams, null, 2)}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    );
                })}

                <View style={styles.footerSpacer} />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272a', // zinc-800
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181b', // zinc-900
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    headerSubtitle: {
        color: '#71717a', // zinc-500
        fontSize: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    scrollContent: {
        padding: 24,
    },
    card: {
        backgroundColor: '#18181b', // zinc-900
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
        padding: 20,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
    dotActive: {
        backgroundColor: '#3b82f6', // blue-500
    },
    dotInactive: {
        backgroundColor: '#3f3f46', // zinc-700
    },
    conditionTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    conditionGroup: {
        color: '#71717a', // zinc-500
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    description: {
        color: '#a1a1aa', // zinc-400
        fontSize: 14,
        lineHeight: 20,
    },
    expandedContent: {
        marginTop: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#27272a', // zinc-800
        marginBottom: 16,
    },
    expandedLabel: {
        color: '#52525b', // zinc-600
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    expandedText: {
        color: '#d4d4d8', // zinc-300
        fontSize: 13,
        lineHeight: 22,
        marginBottom: 16,
    },
    paramsContainer: {
        backgroundColor: '#000',
        padding: 12,
        borderRadius: 8,
    },
    paramsLabel: {
        color: '#52525b', // zinc-600
        fontSize: 10,
        marginBottom: 4,
    },
    paramsText: {
        color: '#22c55e', // green-500 (terminal like)
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 10,
    },
    footerSpacer: {
        height: 48,
    },
});
