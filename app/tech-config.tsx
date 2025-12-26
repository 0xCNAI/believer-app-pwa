import { View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTechStore } from '@/stores/techStore';
import { CONDITION_DEFS } from '@/services/techEngine';
import { StyleSheet } from 'react-native';

// 條件說明彈窗
interface HelpModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    nameCN: string;
    explanation: string;
}

function HelpModal({ visible, onClose, title, nameCN, explanation }: HelpModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{nameCN}</Text>
                        <Text style={styles.modalSubtitle}>{title}</Text>
                    </View>
                    <Text style={styles.modalText}>{explanation}</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                        <Text style={styles.modalCloseBtnText}>了解</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
}

// 獲取條件的中文名稱和說明
function getConditionInfo(id: string) {
    const def = CONDITION_DEFS.find(d => d.id === id);
    return {
        nameCN: def?.nameCN || def?.name || id,
        name: def?.name || id,
        explanation: def?.explanation || '',
    };
}

export default function TechConfigScreen() {
    const router = useRouter();
    const [helpModal, setHelpModal] = useState<{ visible: boolean; id: string }>({ visible: false, id: '' });

    // Store state
    const {
        enabledConditions,
        personalParams,
        conditions,
        phaseResult,
        riskModifiers,
        isLoading,
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

    const phaseNames = {
        Accumulation: '蓄積期',
        Transition: '轉換期',
        Expansion: '擴張期',
    };

    const phaseColors = {
        Accumulation: '#f59e0b',
        Transition: '#3b82f6',
        Expansion: '#22c55e',
    };

    const showHelp = (id: string) => {
        setHelpModal({ visible: true, id });
    };

    const selectedCondition = getConditionInfo(helpModal.id);

    return (
        <View style={styles.container}>
            {/* Help Modal */}
            <HelpModal
                visible={helpModal.visible}
                onClose={() => setHelpModal({ visible: false, id: '' })}
                title={selectedCondition.name}
                nameCN={selectedCondition.nameCN}
                explanation={selectedCondition.explanation}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>技術配置</Text>
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
                            <View>
                                <Text style={[styles.phaseName, { color: phaseColors[phaseResult.phase] }]}>
                                    {phaseNames[phaseResult.phase]}
                                </Text>
                                <Text style={styles.phaseSubname}>{phaseResult.phase}</Text>
                            </View>
                            <View style={styles.capBadge}>
                                <Text style={styles.capText}>上限: {phaseResult.adjustedCap}</Text>
                            </View>
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreLabel}>技術分數</Text>
                            <Text style={styles.scoreValue}>{Math.round(phaseResult.techScore)}</Text>
                        </View>
                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreLabel}>通過條件數</Text>
                            <Text style={styles.scoreValue}>{phaseResult.gatesPassedCount}/4</Text>
                        </View>
                        {phaseResult.liquidityMultiplier !== 1.0 && (
                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>流動性係數</Text>
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
                        <Text style={styles.sectionTitle}>生效調整</Text>
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
                        <Text style={styles.sectionTitle}>核心條件</Text>
                        <Text style={styles.sectionCount}>{gates.filter(g => g.enabled && g.passed).length}/{gates.length}</Text>
                    </View>
                    {gates.map(condition => {
                        const info = getConditionInfo(condition.id);
                        return (
                            <View key={condition.id} style={styles.conditionRow}>
                                <View style={styles.conditionInfo}>
                                    <View style={styles.conditionHeader}>
                                        <View style={[
                                            styles.statusDot,
                                            { backgroundColor: condition.passed ? '#22c55e' : '#71717a' }
                                        ]} />
                                        <Text style={styles.conditionName}>{info.nameCN}</Text>
                                        <TouchableOpacity
                                            style={styles.helpButton}
                                            onPress={() => showHelp(condition.id)}
                                        >
                                            <Ionicons name="help-circle-outline" size={18} color="#71717a" />
                                        </TouchableOpacity>
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
                        );
                    })}
                </View>

                {/* Evidence Boosters */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="flash" size={16} color="#71717a" />
                        <Text style={styles.sectionTitle}>加成條件</Text>
                    </View>
                    {boosters.map(condition => {
                        const info = getConditionInfo(condition.id);
                        return (
                            <View key={condition.id} style={styles.conditionRow}>
                                <View style={styles.conditionInfo}>
                                    <View style={styles.conditionHeader}>
                                        <View style={[
                                            styles.statusDot,
                                            { backgroundColor: condition.passed ? '#3b82f6' : '#71717a' }
                                        ]} />
                                        <Text style={styles.conditionName}>{info.nameCN}</Text>
                                        <TouchableOpacity
                                            style={styles.helpButton}
                                            onPress={() => showHelp(condition.id)}
                                        >
                                            <Ionicons name="help-circle-outline" size={18} color="#71717a" />
                                        </TouchableOpacity>
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
                        );
                    })}
                </View>

                {/* Personal Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="settings" size={16} color="#71717a" />
                        <Text style={styles.sectionTitle}>個人設定</Text>
                    </View>

                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>MA 週期</Text>
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
                        <Text style={styles.paramLabel}>HL 窗口</Text>
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
                                    ]}>{val}週</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>壓縮百分位</Text>
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
                            <Text style={styles.sectionTitle}>風險指標</Text>
                        </View>
                        <View style={styles.riskRow}>
                            <Text style={styles.riskLabel}>資金費率</Text>
                            <Text style={[styles.riskValue, { color: Math.abs(riskModifiers.fundingRate) > 0.02 ? '#ef4444' : '#22c55e' }]}>
                                {riskModifiers.fundingRate.toFixed(4)}%
                            </Text>
                        </View>
                        <View style={styles.riskRow}>
                            <Text style={styles.riskLabel}>流動性狀態</Text>
                            <Text style={[styles.riskValue, {
                                color: riskModifiers.liquidityStatus === 'improving' ? '#22c55e' :
                                    riskModifiers.liquidityStatus === 'tight' ? '#ef4444' : '#71717a'
                            }]}>
                                {riskModifiers.liquidityStatus === 'improving' ? '改善中' :
                                    riskModifiers.liquidityStatus === 'tight' ? '緊縮' : '中性'}
                            </Text>
                        </View>
                        <View style={styles.riskRow}>
                            <Text style={styles.riskLabel}>MVRV Z-Score</Text>
                            <Text style={styles.riskValue}>{riskModifiers.mvrvZScore.toFixed(2)} (模擬)</Text>
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
        fontSize: 14,
        fontWeight: '700',
        color: '#a1a1aa',
        letterSpacing: 1,
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
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    phaseName: {
        fontSize: 24,
        fontWeight: '700',
    },
    phaseSubname: {
        fontSize: 12,
        color: '#71717a',
        marginTop: 2,
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
        flex: 1,
    },
    helpButton: {
        padding: 4,
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 340,
    },
    modalHeader: {
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#71717a',
    },
    modalText: {
        fontSize: 14,
        color: '#a1a1aa',
        lineHeight: 22,
    },
    modalCloseBtn: {
        marginTop: 20,
        backgroundColor: '#27272a',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
