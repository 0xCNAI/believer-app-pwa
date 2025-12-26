import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useTechStore, selectGates, selectBoosters, selectPhase, selectCap, selectTechScore } from '@/stores/techStore';
import { StyleSheet } from 'react-native';

export default function TechConfigScreen() {
    const router = useRouter();

    // Store state
    const {
        enabledConditions,
        personalParams,
        conditions,
        phaseResult,
        riskModifiers,
        isLoading,
        error,
        setConditionEnabled,
        setPersonalParam,
        evaluateAll,
    } = useTechStore();

    const gates = conditions.filter(c => c.group === 'Gate');
    const boosters = conditions.filter(c => c.group === 'Booster');

    // Evaluate on mount
    useEffect(() => {
        evaluateAll();
    }, []);

    const phaseColors = {
        Accumulation: '#f59e0b',
        Transition: '#3b82f6',
        Expansion: '#22c55e',
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>TECH CONFIG</Text>
                <TouchableOpacity onPress={evaluateAll} style={styles.refreshButton}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Ionicons name="refresh" size={18} color="white" />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Phase Display */}
                {phaseResult && (
                    <View style={styles.phaseCard}>
                        <View style={styles.phaseHeader}>
                            <Text style={[styles.phaseName, { color: phaseColors[phaseResult.phase] }]}>
                                {phaseResult.phase}
                            </Text>
                            <View style={styles.capBadge}>
                                <Text style={styles.capText}>Cap: {phaseResult.adjustedCap}</Text>
                            </View>
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreLabel}>Tech Score</Text>
                            <Text style={styles.scoreValue}>{Math.round(phaseResult.techScore)}</Text>
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreLabel}>Gates Passed</Text>
                            <Text style={styles.scoreValue}>{phaseResult.gatesPassedCount}/4</Text>
                        </View>
                        {phaseResult.liquidityMultiplier !== 1.0 && (
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Liquidity</Text>
                                <Text style={[styles.scoreValue, { color: phaseResult.liquidityMultiplier > 1 ? '#22c55e' : '#ef4444' }]}>
                                    ×{phaseResult.liquidityMultiplier.toFixed(1)}
                                </Text>
                            </View>
                        )}
                        {phaseResult.warning && (
                            <Text style={styles.warningText}>{phaseResult.warning}</Text>
                        )}
                    </View>
                )}

                {/* Risk Adjustments */}
                {phaseResult && (phaseResult.boostersApplied.length > 0 || phaseResult.riskAdjustments.length > 0) && (
                    <View style={styles.adjustmentsCard}>
                        <Text style={styles.sectionTitle}>Active Adjustments</Text>
                        <View style={styles.tagContainer}>
                            {phaseResult.boostersApplied.map((adj, i) => (
                                <View key={`b${i}`} style={[styles.tag, { backgroundColor: '#3b82f620' }]}>
                                    <Text style={[styles.tagText, { color: '#3b82f6' }]}>{adj}</Text>
                                </View>
                            ))}
                            {phaseResult.riskAdjustments.map((adj, i) => (
                                <View key={`r${i}`} style={[styles.tag, { backgroundColor: '#f59e0b20' }]}>
                                    <Text style={[styles.tagText, { color: '#f59e0b' }]}>{adj}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Engine Gates */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="lock-closed" size={16} color="#71717a" />
                        <Text style={styles.sectionTitle}>ENGINE GATES</Text>
                        <Text style={styles.sectionCount}>{gates.filter(g => g.enabled && g.passed).length}/{gates.length}</Text>
                    </View>
                    {gates.map(condition => (
                        <View key={condition.id} style={styles.conditionRow}>
                            <View style={styles.conditionInfo}>
                                <View style={styles.conditionHeader}>
                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: condition.passed ? '#22c55e' : '#71717a' }
                                    ]} />
                                    <Text style={styles.conditionName}>{condition.name}</Text>
                                </View>
                                <Text style={styles.conditionDetail}>{condition.detail}</Text>
                                <View style={styles.scoreBar}>
                                    <View style={[styles.scoreBarFill, { width: `${condition.score * 100}%` }]} />
                                </View>
                            </View>
                            <Switch
                                value={enabledConditions[condition.id]}
                                onValueChange={(value) => {
                                    setConditionEnabled(condition.id, value);
                                    evaluateAll();
                                }}
                                trackColor={{ false: '#27272a', true: '#22c55e40' }}
                                thumbColor={enabledConditions[condition.id] ? '#22c55e' : '#71717a'}
                            />
                        </View>
                    ))}
                </View>

                {/* Evidence Boosters */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="flash" size={16} color="#71717a" />
                        <Text style={styles.sectionTitle}>EVIDENCE BOOSTERS</Text>
                    </View>
                    {boosters.map(condition => (
                        <View key={condition.id} style={styles.conditionRow}>
                            <View style={styles.conditionInfo}>
                                <View style={styles.conditionHeader}>
                                    <View style={[
                                        styles.statusDot,
                                        { backgroundColor: condition.passed ? '#3b82f6' : '#71717a' }
                                    ]} />
                                    <Text style={styles.conditionName}>{condition.name}</Text>
                                </View>
                                <Text style={styles.conditionDetail}>{condition.detail}</Text>
                            </View>
                            <Switch
                                value={enabledConditions[condition.id]}
                                onValueChange={(value) => {
                                    setConditionEnabled(condition.id, value);
                                    evaluateAll();
                                }}
                                trackColor={{ false: '#27272a', true: '#3b82f640' }}
                                thumbColor={enabledConditions[condition.id] ? '#3b82f6' : '#71717a'}
                            />
                        </View>
                    ))}
                </View>

                {/* Personal Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="settings" size={16} color="#71717a" />
                        <Text style={styles.sectionTitle}>PERSONAL SETTINGS</Text>
                    </View>

                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>MA Period</Text>
                        <View style={styles.paramOptions}>
                            {([120, 200, 250] as const).map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.paramOption,
                                        personalParams.maPeriod === val && styles.paramOptionActive
                                    ]}
                                    onPress={() => {
                                        setPersonalParam('maPeriod', val);
                                        evaluateAll();
                                    }}
                                >
                                    <Text style={[
                                        styles.paramOptionText,
                                        personalParams.maPeriod === val && styles.paramOptionTextActive
                                    ]}>{val}D</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>HL Window</Text>
                        <View style={styles.paramOptions}>
                            {([4, 6, 8] as const).map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.paramOption,
                                        personalParams.hlWindow === val && styles.paramOptionActive
                                    ]}
                                    onPress={() => {
                                        setPersonalParam('hlWindow', val);
                                        evaluateAll();
                                    }}
                                >
                                    <Text style={[
                                        styles.paramOptionText,
                                        personalParams.hlWindow === val && styles.paramOptionTextActive
                                    ]}>{val}W</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>Vol Percentile</Text>
                        <View style={styles.paramOptions}>
                            {([10, 15, 20] as const).map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[
                                        styles.paramOption,
                                        personalParams.volPercentile === val && styles.paramOptionActive
                                    ]}
                                    onPress={() => {
                                        setPersonalParam('volPercentile', val);
                                        evaluateAll();
                                    }}
                                >
                                    <Text style={[
                                        styles.paramOptionText,
                                        personalParams.volPercentile === val && styles.paramOptionTextActive
                                    ]}>{val}%</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Risk Modifiers Info */}
                {riskModifiers && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="shield-checkmark" size={16} color="#71717a" />
                            <Text style={styles.sectionTitle}>RISK MODIFIERS</Text>
                        </View>
                        <View style={styles.riskRow}>
                            <Text style={styles.riskLabel}>Funding Rate</Text>
                            <Text style={[styles.riskValue, { color: Math.abs(riskModifiers.fundingRate) > 0.02 ? '#ef4444' : '#22c55e' }]}>
                                {riskModifiers.fundingRate.toFixed(4)}%
                            </Text>
                        </View>
                        <View style={styles.riskRow}>
                            <Text style={styles.riskLabel}>Liquidity</Text>
                            <Text style={[styles.riskValue, {
                                color: riskModifiers.liquidityStatus === 'improving' ? '#22c55e' :
                                    riskModifiers.liquidityStatus === 'tight' ? '#ef4444' : '#71717a'
                            }]}>
                                {riskModifiers.liquidityStatus.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.riskRow}>
                            <Text style={styles.riskLabel}>MVRV Z-Score</Text>
                            <Text style={styles.riskValue}>{riskModifiers.mvrvZScore.toFixed(2)} (mock)</Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717a',
        letterSpacing: 2,
    },
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    phaseCard: {
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    phaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    phaseName: {
        fontSize: 24,
        fontWeight: '700',
    },
    capBadge: {
        backgroundColor: '#27272a',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    capText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#a1a1aa',
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    scoreLabel: {
        fontSize: 14,
        color: '#71717a',
    },
    scoreValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    warningText: {
        fontSize: 12,
        color: '#f59e0b',
        marginTop: 8,
    },
    adjustmentsCard: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717a',
        letterSpacing: 1,
        flex: 1,
    },
    sectionCount: {
        fontSize: 12,
        color: '#71717a',
    },
    conditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    conditionInfo: {
        flex: 1,
    },
    conditionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    conditionName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    conditionDetail: {
        fontSize: 12,
        color: '#71717a',
        marginTop: 4,
        marginLeft: 16,
    },
    scoreBar: {
        height: 3,
        backgroundColor: '#27272a',
        borderRadius: 2,
        marginTop: 8,
        marginLeft: 16,
    },
    scoreBarFill: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 2,
    },
    paramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    paramLabel: {
        fontSize: 14,
        color: '#a1a1aa',
    },
    paramOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    paramOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#27272a',
    },
    paramOptionActive: {
        backgroundColor: '#3b82f6',
    },
    paramOptionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#71717a',
    },
    paramOptionTextActive: {
        color: '#fff',
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    riskLabel: {
        fontSize: 14,
        color: '#71717a',
    },
    riskValue: {
        fontSize: 14,
        fontWeight: '600',
    },
});
