import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useUserStore, ExperienceLevel, FocusArea, AlertStyle } from '@/stores/userStore';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInRight, SlideOutLeft, LayoutAnimation } from 'react-native-reanimated';
import { useState } from 'react';

const { width } = Dimensions.get('window');

// --- Configuration Data ---

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string; desc: string }[] = [
    { id: 'none', label: '無交易經驗', desc: '技術趨勢門檻：保守 (觀察基礎結構)' },
    { id: '1-3_years', label: '1–3 年', desc: '技術趨勢門檻：中性 (觀察中長期結構)' },
    { id: '5_plus_years', label: '5 年以上', desc: '技術趨勢門檻：敏感 (多時間框架結構)' },
];

const FOCUS_AREA_OPTIONS: { id: FocusArea; label: string }[] = [
    { id: 'macro', label: '宏觀政策與流動性' },
    { id: 'extreme_repair', label: '市場極端情緒修復' },
    { id: 'btc_structure', label: 'Bitcoin 結構性供需變化' },
    { id: 'policy', label: '政治與監管事件' },
    { id: 'low_prob', label: '長期低機率敘事' },
];

const ALERT_STYLE_OPTIONS: { id: AlertStyle; label: string; desc: string }[] = [
    { id: 'early', label: '較早感知 (變化初期)', desc: '側重「變化出現」，提醒門檻較低' },
    { id: 'balanced', label: '平衡 (結構逐漸確認)', desc: '側重「結構持續改變」，中等靈敏度' },
    { id: 'late', label: '較晚提醒 (狀態較明確)', desc: '側重「狀態轉換」，提醒門檻較高' },
];

import { useBeliefStore } from '@/stores/beliefStore';

export default function OnboardingScreen() {
    const router = useRouter();
    const { completeOnboarding } = useOnboardingStore();
    const { seedFromFocusAreas } = useBeliefStore();
    const {
        experience, setExperience,
        focusAreas, toggleFocusArea,
        alertStyle, setAlertStyle
    } = useUserStore();

    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        // Validation per step
        if (currentStep === 0 && !experience) return;
        if (currentStep === 1 && focusAreas.length === 0) return;
        if (currentStep === 2 && !alertStyle) return;

        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        } else {
            // Just update state. 
            // The RootLayout (_layout.tsx) watches this state and will auto-redirect to "/"
            // This prevents a race condition between imperative router.replace and the layout's declarative Redirect.

            // Seed Dashboard with initial signals based on user focus
            seedFromFocusAreas(focusAreas);

            completeOnboarding();
        }
    };

    // --- Render Content for Each Step ---

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Experience
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.questionTitle}>你對加密貨幣市場的{'\n'}交易經驗為何？</Text>
                        <Text style={styles.questionSubtitle}>這將協助系統調整對市場結構變化的靈敏度。</Text>
                        <View style={styles.optionsContainer}>
                            {EXPERIENCE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[styles.optionCard, experience === opt.id && styles.optionCardSelected]}
                                    onPress={() => setExperience(opt.id)}
                                >
                                    <Text style={[styles.optionLabel, experience === opt.id && styles.textSelected]}>{opt.label}</Text>
                                    <Text style={[styles.optionDesc, experience === opt.id && styles.textSelectedDim]}>{opt.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {experience && (
                            <Text style={styles.feedbackText}>已根據你的交易經驗，調整反轉指數對市場結構變化的感知方式。</Text>
                        )}
                    </View>
                );

            case 1: // Focus Areas
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.questionTitle}>當市場可能出現趨勢轉變時，{'\n'}你比較關注哪一類變化？</Text>
                        <Text style={styles.questionSubtitle}>最多選擇 3 項 (目前 {focusAreas.length}/3)</Text>
                        <View style={styles.optionsContainer}>
                            {FOCUS_AREA_OPTIONS.map((opt) => {
                                const isSelected = focusAreas.includes(opt.id);
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                        onPress={() => toggleFocusArea(opt.id)}
                                    >
                                        <View style={styles.checkboxRow}>
                                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]} />
                                            <Text style={[styles.optionLabel, isSelected && styles.textSelected]}>{opt.label}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {focusAreas.length > 0 && (
                            <Text style={styles.feedbackText}>反轉指數將優先反映你所關注的市場變化類型。</Text>
                        )}
                    </View>
                );

            case 2: // Alert Style
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.questionTitle}>你希望在什麼階段收到提醒？</Text>
                        <Text style={styles.questionSubtitle}>決定通知系統的觸發時機與風格。</Text>
                        <View style={styles.optionsContainer}>
                            {ALERT_STYLE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[styles.optionCard, alertStyle === opt.id && styles.optionCardSelected]}
                                    onPress={() => setAlertStyle(opt.id)}
                                >
                                    <Text style={[styles.optionLabel, alertStyle === opt.id && styles.textSelected]}>{opt.label}</Text>
                                    <Text style={[styles.optionDesc, alertStyle === opt.id && styles.textSelectedDim]}>{opt.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {alertStyle && (
                            <Text style={styles.feedbackText}>提醒將依照你的偏好，在不同階段提示市場狀態的變化。</Text>
                        )}
                    </View>
                );

            case 3: // Summary
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="checkmark-circle-outline" size={80} color="#10b981" />
                        </View>
                        <Text style={styles.summaryTitle}>設定完成</Text>
                        <Text style={styles.summaryText}>
                            你的反轉指數已完成校準，{'\n'}
                            將依照你的觀察偏好，{'\n'}
                            持續追蹤市場結構與趨勢狀態的變化。
                        </Text>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>靈敏度校準</Text>
                                <Text style={styles.summaryValue}>完成</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>關注權重</Text>
                                <Text style={styles.summaryValue}>已配置 {focusAreas.length} 項</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>提醒風格</Text>
                                <Text style={styles.summaryValue}>
                                    {ALERT_STYLE_OPTIONS.find(a => a.id === alertStyle)?.label.split(' ')[0]}
                                </Text>
                            </View>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                {/* Progress Bar */}
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            { width: `${((currentStep) / 3) * 100}%` }
                        ]}
                    />
                </View>
                <Text style={styles.stepText}>STEP  0{currentStep + 1} / 04</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Animated.View
                    key={currentStep}
                    entering={SlideInRight}
                    exiting={SlideOutLeft}
                    style={{ flex: 1 }}
                >
                    {renderStepContent()}
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handleNext}
                    style={[
                        styles.nextButton,
                        (currentStep === 0 && !experience) ||
                            (currentStep === 1 && focusAreas.length === 0) ||
                            (currentStep === 2 && !alertStyle)
                            ? styles.buttonDisabled : {}
                    ]}
                    disabled={
                        (currentStep === 0 && !experience) ||
                        (currentStep === 1 && focusAreas.length === 0) ||
                        (currentStep === 2 && !alertStyle)
                    }
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {currentStep === 3 ? '進入系統 (ENTER)' : '下一步 (NEXT)'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={currentStep === 3 ? '#000' : '#000'} />
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
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#27272a', // zinc-800
        borderRadius: 2,
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3b82f6', // blue-500
        borderRadius: 2,
    },
    stepText: {
        color: '#71717a', // zinc-500
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    stepContainer: {
        flex: 1,
    },
    questionTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        lineHeight: 32,
    },
    questionSubtitle: {
        color: '#a1a1aa', // zinc-400
        fontSize: 14,
        marginBottom: 32,
    },
    optionsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    optionCard: {
        backgroundColor: '#18181b', // zinc-900
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
    },
    optionCardSelected: {
        borderColor: '#3b82f6', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    optionLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    optionDesc: {
        color: '#71717a', // zinc-500
        fontSize: 12,
    },
    textSelected: {
        color: '#3b82f6', // blue-500
    },
    textSelectedDim: {
        color: '#93c5fd', // blue-300
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#52525b', // zinc-600
    },
    checkboxSelected: {
        borderColor: '#3b82f6', // blue-500
        backgroundColor: '#3b82f6',
    },
    feedbackText: {
        color: '#10b981', // emerald-500
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 8,
        lineHeight: 20,
    },
    footer: {
        padding: 24,
        paddingBottom: 48,
    },
    nextButton: {
        backgroundColor: '#fff',
        height: 56,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonDisabled: {
        backgroundColor: '#27272a', // zinc-800
        opacity: 0.5,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
    // Summary
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 40,
    },
    summaryTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 16,
    },
    summaryText: {
        color: '#a1a1aa', // zinc-400
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 48,
    },
    summaryCard: {
        backgroundColor: '#18181b', // zinc-900
        borderRadius: 24,
        padding: 24,
        gap: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryLabel: {
        color: '#71717a', // zinc-500
        fontSize: 12,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    summaryValue: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
