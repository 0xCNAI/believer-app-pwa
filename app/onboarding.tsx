import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useUserStore, ExperienceLevel, PredictionTopic, AlertStyle } from '@/stores/userStore';
import { useBeliefStore } from '@/stores/beliefStore';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

// --- Configuration Data ---

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string; desc: string }[] = [
    { id: 'none', label: '無交易經驗', desc: '技術趨勢門檻：保守 (觀察基礎結構)' },
    { id: '1-3_years', label: '1–3 年', desc: '技術趨勢門檻：中性 (觀察中長期結構)' },
    { id: '5_plus_years', label: '5 年以上', desc: '技術趨勢門檻：敏感 (多時間框架結構)' },
];

// 8 Prediction Market Topics (唯一敘事層選項)
const PREDICTION_TOPIC_OPTIONS: { id: PredictionTopic; label: string; desc: string }[] = [
    { id: 'fed_rate', label: '聯準會降息預期', desc: 'Fed 利率決策、降息時機與次數' },
    { id: 'yield_curve', label: '殖利率曲線轉向預期', desc: '倒掛解除、曲線正常化' },
    { id: 'crypto_regulation', label: '美國加密監管與法案進展', desc: '國會法案、SEC 訴訟結果' },
    { id: 'btc_reserve', label: '美國比特幣戰略儲備', desc: '國家級 BTC 儲備政策' },
    { id: 'pro_crypto_pol', label: '親加密政治結果', desc: '選舉、政權更替對加密的影響' },
    { id: 'eth_etf', label: 'ETH 現貨 ETF 預期', desc: 'SEC 批准 ETH 現貨 ETF' },
    { id: 'institutional', label: '機構級加密採用', desc: '銀行託管、機構產品擴展' },
    { id: 'systemic_risk', label: '系統性金融風險事件', desc: '銀行倒閉、政府停擺、金融危機' },
];

const ALERT_STYLE_OPTIONS: { id: AlertStyle; label: string; desc: string }[] = [
    { id: 'early', label: '較早感知 (變化初期)', desc: '側重「變化出現」，提醒門檻較低' },
    { id: 'balanced', label: '平衡 (結構逐漸確認)', desc: '側重「結構持續改變」，中等靈敏度' },
    { id: 'late', label: '較晚提醒 (狀態較明確)', desc: '側重「狀態轉換」，提醒門檻較高' },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { completeOnboarding } = useOnboardingStore();
    const { seedFromPredictionTopics } = useBeliefStore();
    const {
        experience, setExperience,
        predictionTopics, togglePredictionTopic,
        alertStyle, setAlertStyle
    } = useUserStore();

    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        // Validation per step
        if (currentStep === 0 && !experience) return;
        if (currentStep === 1 && predictionTopics.length === 0) return;
        if (currentStep === 2 && !alertStyle) return;

        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        } else {
            // Seed Dashboard with initial signals based on prediction topics
            seedFromPredictionTopics(predictionTopics);
            completeOnboarding();
            router.replace('/');
        }
    };

    // --- Render Content for Each Step ---

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // Experience
                return (
                    <StyledView className="flex-1">
                        <StyledText className="text-white text-2xl font-bold mb-2 leading-8">你對加密貨幣市場的{'\n'}交易經驗為何？</StyledText>
                        <StyledText className="text-zinc-400 text-sm mb-8">這將協助系統調整對市場結構變化的靈敏度。</StyledText>
                        <StyledView className="gap-3 mb-6">
                            {EXPERIENCE_OPTIONS.map((opt) => (
                                <StyledTouchableOpacity
                                    key={opt.id}
                                    className={`p-5 rounded-2xl border ${experience === opt.id ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
                                    onPress={() => setExperience(opt.id)}
                                >
                                    <StyledText className={`text-base font-bold mb-1 ${experience === opt.id ? 'text-blue-500' : 'text-white'}`}>{opt.label}</StyledText>
                                    <StyledText className={`text-xs ${experience === opt.id ? 'text-blue-300' : 'text-zinc-500'}`}>{opt.desc}</StyledText>
                                </StyledTouchableOpacity>
                            ))}
                        </StyledView>
                        {experience && (
                            <StyledText className="text-emerald-500 text-xs font-bold mt-2 leading-5">已根據你的交易經驗，調整反轉指數對市場結構變化的感知方式。</StyledText>
                        )}
                    </StyledView>
                );

            case 1: // Prediction Topics (新的敘事選項)
                return (
                    <StyledView className="flex-1">
                        <StyledText className="text-white text-2xl font-bold mb-2 leading-8">你想追蹤哪些{'\n'}預測市場主題？</StyledText>
                        <StyledText className="text-zinc-400 text-sm mb-6">選擇你關注的市場預期（最多 5 項，目前 {predictionTopics.length}/5）</StyledText>
                        <StyledView className="gap-2 mb-6">
                            {PREDICTION_TOPIC_OPTIONS.map((opt) => {
                                const isSelected = predictionTopics.includes(opt.id);
                                return (
                                    <StyledTouchableOpacity
                                        key={opt.id}
                                        className={`p-4 rounded-2xl border ${isSelected ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
                                        onPress={() => togglePredictionTopic(opt.id)}
                                    >
                                        <StyledView className="flex-row items-center gap-3">
                                            <StyledView className={`w-5 h-5 rounded-md border-2 items-center justify-center ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'}`}>
                                                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                            </StyledView>
                                            <StyledView className="flex-1">
                                                <StyledText className={`text-sm font-bold ${isSelected ? 'text-blue-500' : 'text-white'}`}>{opt.label}</StyledText>
                                                <StyledText className={`text-xs ${isSelected ? 'text-blue-300' : 'text-zinc-500'}`}>{opt.desc}</StyledText>
                                            </StyledView>
                                        </StyledView>
                                    </StyledTouchableOpacity>
                                );
                            })}
                        </StyledView>
                        {predictionTopics.length > 0 && (
                            <StyledText className="text-emerald-500 text-xs font-bold mt-2 leading-5">系統將為你訂閱對應的 Polymarket / Kalshi 預測市場。</StyledText>
                        )}
                    </StyledView>
                );

            case 2: // Alert Style
                return (
                    <StyledView className="flex-1">
                        <StyledText className="text-white text-2xl font-bold mb-2 leading-8">你希望在什麼階段收到提醒？</StyledText>
                        <StyledText className="text-zinc-400 text-sm mb-8">決定通知系統的觸發時機與風格。</StyledText>
                        <StyledView className="gap-3 mb-6">
                            {ALERT_STYLE_OPTIONS.map((opt) => (
                                <StyledTouchableOpacity
                                    key={opt.id}
                                    className={`p-5 rounded-2xl border ${alertStyle === opt.id ? 'bg-blue-500/10 border-blue-500' : 'bg-zinc-900 border-zinc-800'}`}
                                    onPress={() => setAlertStyle(opt.id)}
                                >
                                    <StyledText className={`text-base font-bold mb-1 ${alertStyle === opt.id ? 'text-blue-500' : 'text-white'}`}>{opt.label}</StyledText>
                                    <StyledText className={`text-xs ${alertStyle === opt.id ? 'text-blue-300' : 'text-zinc-500'}`}>{opt.desc}</StyledText>
                                </StyledTouchableOpacity>
                            ))}
                        </StyledView>
                        {alertStyle && (
                            <StyledText className="text-emerald-500 text-xs font-bold mt-2 leading-5">提醒將依照你的偏好，在不同階段提示市場狀態的變化。</StyledText>
                        )}
                    </StyledView>
                );

            case 3: // Summary
                return (
                    <StyledView className="flex-1">
                        <StyledView className="items-center mb-6 mt-10">
                            <Ionicons name="checkmark-circle-outline" size={80} color="#10b981" />
                        </StyledView>
                        <StyledText className="text-white text-3xl font-black text-center mb-4">設定完成</StyledText>
                        <StyledText className="text-zinc-400 text-center text-base leading-6 mb-12">
                            你的反轉指數已完成校準，{'\n'}
                            將依照你的觀察偏好，{'\n'}
                            持續追蹤市場預期與趨勢狀態的變化。
                        </StyledText>

                        <StyledView className="bg-zinc-900 rounded-3xl p-6 gap-4">
                            <StyledView className="flex-row justify-between items-center">
                                <StyledText className="text-zinc-500 text-xs uppercase font-bold">靈敏度校準</StyledText>
                                <StyledText className="text-white font-bold text-sm">完成</StyledText>
                            </StyledView>
                            <StyledView className="flex-row justify-between items-center">
                                <StyledText className="text-zinc-500 text-xs uppercase font-bold">追蹤主題</StyledText>
                                <StyledText className="text-white font-bold text-sm">已配置 {predictionTopics.length} 項</StyledText>
                            </StyledView>
                            <StyledView className="flex-row justify-between items-center">
                                <StyledText className="text-zinc-500 text-xs uppercase font-bold">提醒風格</StyledText>
                                <StyledText className="text-white font-bold text-sm">
                                    {ALERT_STYLE_OPTIONS.find(a => a.id === alertStyle)?.label.split(' ')[0]}
                                </StyledText>
                            </StyledView>
                        </StyledView>
                    </StyledView>
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
            <StatusBar style="light" />

            <StyledView className="px-6 pt-4 pb-2">
                {/* Progress Bar */}
                <StyledView className="h-1 bg-zinc-800 rounded-full mb-2">
                    <StyledView
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${((currentStep) / 3) * 100}%` }}
                    />
                </StyledView>
                <StyledText className="text-zinc-500 text-[10px] font-bold tracking-widest">STEP  0{currentStep + 1} / 04</StyledText>
            </StyledView>

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32 }}>
                <StyledView className="flex-1">
                    {renderStepContent()}
                </StyledView>
            </ScrollView>

            <StyledView className="p-6 pb-12">
                <StyledTouchableOpacity
                    onPress={handleNext}
                    className={`h-14 rounded-full flex-row items-center justify-center gap-2 ${(currentStep === 0 && !experience) ||
                        (currentStep === 1 && predictionTopics.length === 0) ||
                        (currentStep === 2 && !alertStyle)
                        ? 'bg-zinc-800 opacity-50' : 'bg-white'
                        }`}
                    disabled={
                        (currentStep === 0 && !experience) ||
                        (currentStep === 1 && predictionTopics.length === 0) ||
                        (currentStep === 2 && !alertStyle)
                    }
                    activeOpacity={0.8}
                >
                    <StyledText className="text-black font-bold text-sm tracking-widest">
                        {currentStep === 3 ? '進入系統 (ENTER)' : '下一步 (NEXT)'}
                    </StyledText>
                    <Ionicons name="arrow-forward" size={20} color="#000" />
                </StyledTouchableOpacity>
            </StyledView>
        </SafeAreaView>
    );
}
