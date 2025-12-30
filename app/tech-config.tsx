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
    isPhaseExplain?: boolean;
}

function HelpModal({ visible, onClose, title, nameCN, explanation, isPhaseExplain }: HelpModalProps) {
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
                        <Text style={styles.modalTitle}>{isPhaseExplain ? '階段說明' : nameCN}</Text>
                        {!isPhaseExplain && <Text style={styles.modalSubtitle}>{title}</Text>}
                    </View>

                    {isPhaseExplain ? (
                        <View style={styles.phaseExplainContent}>
                            {/* 蓄積期 */}
                            <View style={styles.phaseExplainBlock}>
                                <Text style={styles.phaseExplainTitle}>蓄積期（Accumulation）</Text>
                                <Text style={styles.phaseExplainDesc}>技術結構仍為下行或未修復</Text>
                                <Text style={styles.phaseExplainDesc}>市場尚未取得反轉資格</Text>
                                <Text style={styles.phaseExplainDesc}>本階段目的：排除假反轉</Text>
                            </View>
                            {/* 過渡期 */}
                            <View style={styles.phaseExplainBlock}>
                                <Text style={styles.phaseExplainTitle}>過渡期（Transition）</Text>
                                <Text style={styles.phaseExplainDesc}>部分關鍵結構條件成立</Text>
                                <Text style={styles.phaseExplainDesc}>技術面不再否定反轉</Text>
                                <Text style={styles.phaseExplainDesc}>本階段目的：避免誤判</Text>
                            </View>
                            {/* 展開期 */}
                            <View style={styles.phaseExplainBlock}>
                                <Text style={styles.phaseExplainTitle}>展開期（Expansion）</Text>
                                <Text style={styles.phaseExplainDesc}>多數結構條件成立</Text>
                                <Text style={styles.phaseExplainDesc}>技術結構已轉向</Text>
                                <Text style={styles.phaseExplainDesc}>本階段目的：確認反轉</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.modalText}>{explanation}</Text>
                    )}

                    <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                        <Text style={styles.modalCloseBtnText}>了解</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
}

// Phase 說明內容
const PHASE_EXPLANATIONS = {
    Accumulation: {
        name: '蓄積期（Accumulation）',
        desc: '技術結構仍為下行或未修復\n市場尚未取得反轉資格\n本階段目的：排除假反轉',
    },
    Transition: {
        name: '過渡期（Transition）',
        desc: '部分關鍵結構條件成立\n技術面不再否定反轉\n本階段目的：避免誤判',
    },
    Expansion: {
        name: '展開期（Expansion）',
        desc: '多數結構條件成立\n技術結構已轉向\n本階段目的：確認反轉',
    },
};

// Gate 條件與 Phase 關係
const GATE_PHASE_RELATION: Record<string, string> = {
    'price_vs_200d': '此條件是進入「過渡期」的必要條件之一',
    'ma_slope_flat': '此條件是進入「過渡期」的必要條件之一',
    'higher_low': '此條件是進入「過渡期」的必要條件之一',
    'vol_compression': '此條件是進入「過渡期」的必要條件之一',
};

// 獲取條件的中文名稱和說明
function getConditionInfo(id: string) {
    // Special case for phase explanation
    if (id === 'phase_explain') {
        return {
            nameCN: 'Phase 階段說明',
            name: 'Phase Explanation',
            explanation: `${PHASE_EXPLANATIONS.Accumulation.name}\n${PHASE_EXPLANATIONS.Accumulation.desc}\n\n${PHASE_EXPLANATIONS.Transition.name}\n${PHASE_EXPLANATIONS.Transition.desc}\n\n${PHASE_EXPLANATIONS.Expansion.name}\n${PHASE_EXPLANATIONS.Expansion.desc}`,
            phaseRelation: '',
        };
    }

    const def = CONDITION_DEFS.find(d => d.id === id);
    return {
        nameCN: def?.nameCN || def?.name || id,
        name: def?.name || id,
        explanation: def?.explanation || '',
        phaseRelation: GATE_PHASE_RELATION[id] || '',
    };
}

// 將技術數據轉換為語義描述
function getSemanticStatus(id: string, detail: string, passed: boolean): { semantic: string; icon: string } {
    const passIcon = passed ? '✓' : '✗';

    switch (id) {
        case 'price_vs_200d':
            if (passed) return { semantic: '接近均線', icon: passIcon };
            return { semantic: '遠離均線', icon: passIcon };
        case 'ma_slope_flat':
            if (passed) return { semantic: '趨平或上升', icon: passIcon };
            return { semantic: '仍在下跌', icon: passIcon };
        case 'higher_low':
            if (passed) return { semantic: '結構改善', icon: passIcon };
            return { semantic: '尚未確認', icon: passIcon };
        case 'vol_compression':
            if (passed) return { semantic: '能量蓄積中', icon: passIcon };
            return { semantic: '尚未壓縮', icon: passIcon };
        case 'momentum_divergence':
            if (passed) return { semantic: '背離形成', icon: passIcon };
            return { semantic: '無背離', icon: passIcon };
        case 'volume_confirmation':
            if (passed) return { semantic: '量能確認', icon: passIcon };
            return { semantic: '量能不足', icon: passIcon };
        case 'range_breakout':
            if (passed) return { semantic: '突破成功', icon: passIcon };
            return { semantic: '區間內', icon: passIcon };
        case 'vol_expansion':
            if (detail?.includes('up')) return { semantic: '向上擴張', icon: passIcon };
            if (detail?.includes('down')) return { semantic: '向下擴張', icon: passIcon };
            return { semantic: '波動平穩', icon: passIcon };
        default:
            return { semantic: passed ? '成立' : '未成立', icon: passIcon };
    }
}

export default function TechConfigScreen() {
    const router = useRouter();
    const [helpModal, setHelpModal] = useState<{ visible: boolean; id: string }>({ visible: false, id: '' });
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Store state
    const {
        enabledConditions,
        personalParams,
        conditions,
        reversalState,
        reversalInputs,
        isLoading,
        setConditionEnabled,
        setPersonalParam,
        evaluateAll,
    } = useTechStore();

    // Shim for UI Compatibility (V2.6 State -> V1.0 UI)
    const phaseResult = reversalState ? {
        phase: (reversalState.stage === 'Confirmed' ? 'Expansion' :
            ['Watch', 'Prepare'].includes(reversalState.stage) ? 'Transition' : 'Accumulation') as 'Accumulation' | 'Transition' | 'Expansion',
        gatesPassedCount: reversalInputs?.gateCount || 0
    } : null;

    const riskModifiers = reversalInputs ? {
        fundingRate: reversalInputs.funding24hWeighted || 0,
        mvrvZScore: reversalInputs.mvrvZScore || 0,
        liquidityStatus: 'neutral' // defaulting
    } : null;

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

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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
                isPhaseExplain={helpModal.id === 'phase_explain'}
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
                {/* Phase Flow Visualization (NEW V2) */}
                {phaseResult && (
                    <View style={styles.phaseFlowCard}>
                        <Text style={styles.phaseFlowTitle}>技術結構流程</Text>

                        {/* Phase Progress Line */}
                        <View style={styles.phaseFlowBar}>
                            {/* 蓄積期 */}
                            <View style={styles.phaseNode}>
                                <View style={[
                                    styles.phaseCircle,
                                    phaseResult.phase === 'Accumulation' && styles.phaseCircleActive
                                ]}>
                                    {phaseResult.phase === 'Accumulation' ? (
                                        <View style={styles.phaseCircleFill} />
                                    ) : (
                                        <Ionicons name="checkmark" size={12} color="#22c55e" />
                                    )}
                                </View>
                                <Text style={[
                                    styles.phaseNodeLabel,
                                    phaseResult.phase === 'Accumulation' && styles.phaseNodeLabelActive
                                ]}>蓄積期</Text>
                            </View>

                            {/* Line 1 */}
                            <View style={[
                                styles.phaseLine,
                                phaseResult.phase !== 'Accumulation' && styles.phaseLineFilled
                            ]} />

                            {/* 過渡期 */}
                            <View style={styles.phaseNode}>
                                <View style={[
                                    styles.phaseCircle,
                                    phaseResult.phase === 'Transition' && styles.phaseCircleActive,
                                    phaseResult.phase === 'Expansion' && styles.phaseCirclePassed
                                ]}>
                                    {phaseResult.phase === 'Transition' ? (
                                        <View style={styles.phaseCircleFill} />
                                    ) : phaseResult.phase === 'Expansion' ? (
                                        <Ionicons name="checkmark" size={12} color="#22c55e" />
                                    ) : null}
                                </View>
                                <Text style={[
                                    styles.phaseNodeLabel,
                                    phaseResult.phase === 'Transition' && styles.phaseNodeLabelActive
                                ]}>過渡期</Text>
                            </View>

                            {/* Line 2 */}
                            <View style={[
                                styles.phaseLine,
                                phaseResult.phase === 'Expansion' && styles.phaseLineFilled
                            ]} />

                            {/* 展開期 */}
                            <View style={styles.phaseNode}>
                                <View style={[
                                    styles.phaseCircle,
                                    phaseResult.phase === 'Expansion' && styles.phaseCircleActive
                                ]}>
                                    {phaseResult.phase === 'Expansion' && (
                                        <View style={styles.phaseCircleFill} />
                                    )}
                                </View>
                                <Text style={[
                                    styles.phaseNodeLabel,
                                    phaseResult.phase === 'Expansion' && styles.phaseNodeLabelActive
                                ]}>展開期</Text>
                            </View>
                        </View>

                        {/* Current Phase + Help */}
                        <View style={styles.phaseCurrentRow}>
                            <View style={styles.phaseCurrentInfo}>
                                <Text style={styles.phaseCurrentLabel}>目前階段：</Text>
                                <Text style={[styles.phaseCurrentValue, { color: phaseColors[phaseResult.phase] }]}>
                                    {phaseNames[phaseResult.phase]}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.phaseHelpBtn}
                                onPress={() => setHelpModal({ visible: true, id: 'phase_explain' })}
                            >
                                <Ionicons name="help-circle-outline" size={20} color="#52525b" />
                            </TouchableOpacity>
                        </View>

                        {/* Next Phase Requirements */}
                        <View style={styles.phaseNextInfo}>
                            <Text style={styles.phaseNextText}>
                                {phaseResult.phase === 'Accumulation'
                                    ? `進入過渡期需要：${phaseResult.gatesPassedCount} / 4 條件成立`
                                    : phaseResult.phase === 'Transition'
                                        ? `進入展開期需要：${phaseResult.gatesPassedCount} / 4 條件成立`
                                        : '已進入展開期，技術結構已轉向'
                                }
                            </Text>
                        </View>
                    </View>
                )}

                {/* === PHASE GATES === */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderBlock}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="cube" size={18} color="#22c55e" />
                            <Text style={styles.sectionTitleGate}>Phase Gates</Text>
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionBadgeText}>{gates.filter(g => g.enabled && g.passed).length}/{gates.length}</Text>
                            </View>
                        </View>
                        <Text style={styles.sectionDesc}>
                            決定市場是否允許進入反轉階段。建議保持開啟。
                        </Text>
                    </View>

                    {gates.map(condition => {
                        const info = getConditionInfo(condition.id);
                        const status = getSemanticStatus(condition.id, condition.detail || '', condition.passed);
                        const isExpanded = expandedIds.has(condition.id);

                        return (
                            <View key={condition.id} style={[styles.conditionCard, condition.passed && styles.conditionCardPassed]}>
                                <TouchableOpacity
                                    style={styles.conditionMain}
                                    onPress={() => toggleExpand(condition.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.conditionLeft}>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: condition.passed ? '#22c55e20' : '#71717a20' }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                { color: condition.passed ? '#22c55e' : '#71717a' }
                                            ]}>{status.semantic}</Text>
                                            <Text style={{ color: condition.passed ? '#22c55e' : '#71717a', fontSize: 12 }}>
                                                {status.icon}
                                            </Text>
                                        </View>
                                        <View style={styles.conditionTitleRow}>
                                            <Text style={styles.conditionName}>{info.nameCN}</Text>
                                            <TouchableOpacity
                                                style={styles.helpButtonInline}
                                                onPress={() => showHelp(condition.id)}
                                            >
                                                <Ionicons name="help-circle-outline" size={18} color="#52525b" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Switch
                                        value={enabledConditions[condition.id]}
                                        onValueChange={(value) => {
                                            setConditionEnabled(condition.id, value);
                                            evaluateAll();
                                        }}
                                        trackColor={{ false: '#27272a', true: '#22c55e40' }}
                                        thumbColor={enabledConditions[condition.id] ? '#22c55e' : '#52525b'}
                                    />
                                </TouchableOpacity>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <View style={styles.conditionDetail}>
                                        <Text style={styles.detailLabel}>原始數據</Text>
                                        <Text style={styles.detailValue}>{condition.detail}</Text>
                                        <View style={styles.scoreBar}>
                                            <View style={[styles.scoreBarFill, { width: `${condition.score * 100}%` }]} />
                                        </View>
                                        {/* Phase Relationship */}
                                        {info.phaseRelation && (
                                            <View style={styles.phaseRelationBox}>
                                                <Text style={styles.phaseRelationText}>
                                                    {info.phaseRelation}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* === EVIDENCE BOOSTERS === */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderBlock}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="flash" size={18} color="#3b82f6" />
                            <Text style={styles.sectionTitleBooster}>Evidence Boosters</Text>
                        </View>
                        <Text style={styles.sectionDesc}>
                            提高或降低可信度，不改變 Phase 判定。可自由開關。
                        </Text>
                    </View>

                    {boosters.map(condition => {
                        const info = getConditionInfo(condition.id);
                        const status = getSemanticStatus(condition.id, condition.detail || '', condition.passed);
                        const isExpanded = expandedIds.has(condition.id);

                        return (
                            <View key={condition.id} style={styles.conditionCard}>
                                <TouchableOpacity
                                    style={styles.conditionMain}
                                    onPress={() => toggleExpand(condition.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.conditionLeft}>
                                        <View style={[
                                            styles.statusBadge,
                                            { backgroundColor: condition.passed ? '#3b82f620' : '#71717a20' }
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                { color: condition.passed ? '#3b82f6' : '#71717a' }
                                            ]}>{status.semantic}</Text>
                                            <Text style={{ color: condition.passed ? '#3b82f6' : '#71717a', fontSize: 12 }}>
                                                {status.icon}
                                            </Text>
                                        </View>
                                        <View style={styles.conditionTitleRow}>
                                            <Text style={styles.conditionName}>{info.nameCN}</Text>
                                            <TouchableOpacity
                                                style={styles.helpButtonInline}
                                                onPress={() => showHelp(condition.id)}
                                            >
                                                <Ionicons name="help-circle-outline" size={18} color="#52525b" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Switch
                                        value={enabledConditions[condition.id]}
                                        onValueChange={(value) => {
                                            setConditionEnabled(condition.id, value);
                                            evaluateAll();
                                        }}
                                        trackColor={{ false: '#27272a', true: '#3b82f640' }}
                                        thumbColor={enabledConditions[condition.id] ? '#3b82f6' : '#52525b'}
                                    />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.conditionDetail}>
                                        <Text style={styles.detailLabel}>原始數據</Text>
                                        <Text style={styles.detailValue}>{condition.detail}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* === PERSONAL SETTINGS === */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderBlock}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="options" size={18} color="#a1a1aa" />
                            <Text style={styles.sectionTitlePersonal}>個人偏好</Text>
                        </View>
                        <Text style={styles.sectionDesc}>
                            調整計算參數，不影響 Phase 邏輯，只改變敏感度。
                        </Text>
                    </View>

                    <View style={styles.paramCard}>
                        <View style={styles.paramLabelRow}>
                            <Text style={styles.paramLabel}>MA 週期</Text>
                            <TouchableOpacity
                                style={styles.helpButtonInline}
                                onPress={() => showHelp('price_vs_200d')}
                            >
                                <Ionicons name="help-circle-outline" size={16} color="#52525b" />
                            </TouchableOpacity>
                        </View>
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

                    <View style={styles.paramCard}>
                        <View style={styles.paramLabelRow}>
                            <Text style={styles.paramLabel}>結構判定窗口</Text>
                            <TouchableOpacity
                                style={styles.helpButtonInline}
                                onPress={() => showHelp('higher_low')}
                            >
                                <Ionicons name="help-circle-outline" size={16} color="#52525b" />
                            </TouchableOpacity>
                        </View>
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
                                    ]}>{val} 週</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.paramCard}>
                        <View style={styles.paramLabelRow}>
                            <Text style={styles.paramLabel}>波動壓縮閾值</Text>
                            <TouchableOpacity
                                style={styles.helpButtonInline}
                                onPress={() => showHelp('vol_compression')}
                            >
                                <Ionicons name="help-circle-outline" size={16} color="#52525b" />
                            </TouchableOpacity>
                        </View>
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

                {/* === MARKET ENVIRONMENT (Read-only) === */}
                {riskModifiers && (
                    <View style={styles.envSection}>
                        <View style={styles.envHeader}>
                            <Ionicons name="globe-outline" size={20} color="#52525b" />
                            <Text style={styles.envTitle}>市場環境</Text>
                            <View style={styles.readOnlyBadge}>
                                <Text style={styles.readOnlyText}>只讀</Text>
                            </View>
                        </View>
                        <Text style={styles.envDesc}>
                            外部環境指標，影響反轉可信度，但不可由用戶調整。
                        </Text>

                        <View style={styles.envCard}>
                            <View style={styles.envRow}>
                                <Text style={styles.envLabel}>資金費率</Text>
                                <View style={styles.envValueRow}>
                                    <Text style={[styles.envStatus, {
                                        color: Math.abs(riskModifiers.fundingRate) > 0.02 ? '#ef4444' : '#71717a'
                                    }]}>
                                        {Math.abs(riskModifiers.fundingRate) > 0.02 ? '槓桿過熱' : '中性'}
                                    </Text>
                                    <Text style={styles.envRaw}>{riskModifiers.fundingRate.toFixed(4)}%</Text>
                                </View>
                            </View>

                            <View style={styles.envDivider} />

                            <View style={styles.envRow}>
                                <Text style={styles.envLabel}>流動性狀態</Text>
                                <Text style={[styles.envStatus, {
                                    color: riskModifiers.liquidityStatus === 'improving' ? '#22c55e' :
                                        riskModifiers.liquidityStatus === 'tight' ? '#ef4444' : '#71717a'
                                }]}>
                                    {riskModifiers.liquidityStatus === 'improving' ? '改善中' :
                                        riskModifiers.liquidityStatus === 'tight' ? '緊縮' : '中性'}
                                </Text>
                            </View>

                            <View style={styles.envDivider} />

                            <View style={styles.envRow}>
                                <Text style={styles.envLabel}>MVRV Z-Score</Text>
                                <View style={styles.envValueRow}>
                                    <Text style={[styles.envStatus, {
                                        color: riskModifiers.mvrvZScore < -1 ? '#22c55e' :
                                            riskModifiers.mvrvZScore > 2 ? '#ef4444' : '#71717a'
                                    }]}>
                                        {riskModifiers.mvrvZScore < -1 ? '低估' :
                                            riskModifiers.mvrvZScore > 2 ? '高估' : '中性'}
                                    </Text>
                                    <Text style={styles.envRaw}>{riskModifiers.mvrvZScore.toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.envFooter}>數據每 5 分鐘更新</Text>
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
        backgroundColor: '#09090b',
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
        fontSize: 16,
        fontWeight: '600',
        color: '#fafafa',
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

    // Phase Card
    phaseCard: {
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    phaseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    phaseName: {
        fontSize: 28,
        fontWeight: '700',
    },
    phaseSubname: {
        fontSize: 12,
        color: '#52525b',
        marginTop: 2,
    },
    capBadge: {
        backgroundColor: '#27272a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    capText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#a1a1aa',
    },
    phaseStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fafafa',
    },
    statLabel: {
        fontSize: 11,
        color: '#52525b',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#27272a',
    },

    // Section
    section: {
        marginBottom: 28,
    },
    sectionHeaderBlock: {
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    sectionTitleGate: {
        fontSize: 14,
        fontWeight: '700',
        color: '#22c55e',
        flex: 1,
    },
    sectionTitleBooster: {
        fontSize: 14,
        fontWeight: '700',
        color: '#3b82f6',
        flex: 1,
    },
    sectionTitlePersonal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#a1a1aa',
        flex: 1,
    },
    sectionTitleRisk: {
        fontSize: 14,
        fontWeight: '700',
        color: '#f59e0b',
        flex: 1,
    },
    sectionBadge: {
        backgroundColor: '#22c55e20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    sectionBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#22c55e',
    },
    sectionDesc: {
        fontSize: 12,
        color: '#52525b',
        lineHeight: 18,
    },

    // Condition Card
    conditionCard: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    conditionCardPassed: {
        borderLeftWidth: 3,
        borderLeftColor: '#22c55e',
    },
    conditionMain: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    conditionLeft: {
        flex: 1,
        gap: 8,
    },
    conditionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    conditionName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#e4e4e7',
    },
    conditionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    helpButtonInline: {
        padding: 2,
    },
    helpButton: {
        padding: 4,
    },
    conditionDetail: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#27272a',
        paddingTop: 12,
    },
    detailLabel: {
        fontSize: 11,
        color: '#52525b',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 13,
        color: '#71717a',
        fontFamily: 'monospace',
    },
    scoreBar: {
        height: 3,
        backgroundColor: '#27272a',
        borderRadius: 2,
        marginTop: 8,
    },
    scoreBarFill: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 2,
    },

    // Param Card
    paramCard: {
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
    paramLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    paramOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    paramOption: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#27272a',
    },
    paramOptionActive: {
        backgroundColor: '#3b82f6',
    },
    paramOptionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#52525b',
    },
    paramOptionTextActive: {
        color: '#fff',
    },

    // Risk Card
    riskCard: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    riskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    riskLabel: {
        fontSize: 14,
        color: '#71717a',
    },
    riskValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#a1a1aa',
    },
    riskDetail: {
        fontSize: 11,
        color: '#52525b',
        marginTop: 4,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#18181b',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
    },
    modalHeader: {
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fafafa',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#52525b',
    },
    modalText: {
        fontSize: 15,
        color: '#a1a1aa',
        lineHeight: 24,
    },
    modalCloseBtn: {
        marginTop: 24,
        backgroundColor: '#27272a',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalCloseBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fafafa',
    },

    // Market Environment (Read-only)
    envSection: {
        marginBottom: 28,
        backgroundColor: '#0c0c0f',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272a',
    },
    envHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    envTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#a1a1aa',
        flex: 1,
    },
    readOnlyBadge: {
        backgroundColor: '#27272a',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    readOnlyText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#52525b',
        textTransform: 'uppercase',
    },
    envDesc: {
        fontSize: 12,
        color: '#71717a',
        lineHeight: 18,
        marginBottom: 16,
    },
    envCard: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 16,
    },
    envRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    envLabel: {
        fontSize: 14,
        color: '#a1a1aa',
    },
    envValueRow: {
        alignItems: 'flex-end',
    },
    envStatus: {
        fontSize: 14,
        fontWeight: '600',
    },
    envRaw: {
        fontSize: 11,
        color: '#71717a',
        marginTop: 2,
    },
    envDivider: {
        height: 1,
        backgroundColor: '#27272a',
        marginVertical: 12,
    },
    envFooter: {
        fontSize: 10,
        color: '#3f3f46',
        textAlign: 'center',
        marginTop: 12,
    },

    // Phase Flow Styles (V2)
    phaseFlowCard: {
        backgroundColor: '#0c0c0f',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#1f1f22',
    },
    phaseFlowTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#52525b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
        textAlign: 'center',
    },
    phaseFlowBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    phaseNode: {
        alignItems: 'center',
    },
    phaseCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3f3f46',
        backgroundColor: '#18181b',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    phaseCircleActive: {
        borderColor: '#22c55e',
        backgroundColor: '#22c55e20',
    },
    phaseCirclePassed: {
        borderColor: '#22c55e',
        backgroundColor: '#22c55e20',
    },
    phaseCircleFill: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22c55e',
    },
    phaseNodeLabel: {
        fontSize: 12,
        color: '#52525b',
        fontWeight: '500',
    },
    phaseNodeLabelActive: {
        color: '#fafafa',
        fontWeight: '700',
    },
    phaseLine: {
        width: 48,
        height: 2,
        backgroundColor: '#27272a',
        marginHorizontal: 8,
        marginBottom: 24,
        borderStyle: 'dashed',
    },
    phaseLineFilled: {
        backgroundColor: '#22c55e',
    },
    phaseCurrentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    phaseCurrentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    phaseCurrentLabel: {
        fontSize: 14,
        color: '#71717a',
    },
    phaseCurrentValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    phaseHelpBtn: {
        marginLeft: 8,
        padding: 4,
    },
    phaseNextInfo: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    phaseNextText: {
        fontSize: 13,
        color: '#a1a1aa',
        fontWeight: '500',
    },
    phaseRelationBox: {
        marginTop: 12,
        backgroundColor: '#22c55e10',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#22c55e30',
    },
    phaseRelationText: {
        fontSize: 12,
        color: '#22c55e',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    phaseExplainContent: {
        marginBottom: 16,
    },
    phaseExplainBlock: {
        marginBottom: 16,
    },
    phaseExplainTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#22c55e',
        marginBottom: 8,
    },
    phaseExplainDesc: {
        fontSize: 14,
        color: '#a1a1aa',
        marginBottom: 4,
        lineHeight: 22,
    },
});
