import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useBeliefStore } from '@/stores/beliefStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useCallback } from 'react';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    runOnJS,
    Easing,
} from 'react-native-reanimated';

// Asset Imports
const WOODEN_FISH_IMAGE = require('@/assets/images/wooden-fish.png');
const ARROW_IMAGE = require('@/assets/images/arrow.png');

// Types
interface FloatingArrowItem {
    id: number;
    x: number;
    y: number;
}

const FloatingArrow = ({ onComplete }: { onComplete: () => void }) => {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    useEffect(() => {
        translateY.value = withTiming(-100, { duration: 1000, easing: Easing.out(Easing.quad) });
        opacity.value = withTiming(0, { duration: 1000 }, (finished) => {
            if (finished) {
                runOnJS(onComplete)();
            }
        });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: 0.8 }], // Small icon
        opacity: opacity.value,
        position: 'absolute',
        top: '50%', // Start from center-ish of the fish area
        left: '50%',
        marginLeft: -10, // Center the arrow (assuming ~20px width)
        marginTop: -50,  // Start slightly above center
        zIndex: 10
    }));

    return (
        <Animated.View style={animatedStyle} pointerEvents="none">
            <Image
                source={ARROW_IMAGE}
                style={{ width: 40, height: 40 }} // Adjusted size for "small icon"
                resizeMode="contain"
            />
        </Animated.View>
    );
};

export default function FaithScreen() {
    const { faithClicks, incrementFaith } = useBeliefStore();
    const { resetOnboarding } = useOnboardingStore();

    // Animation Values
    const scale = useSharedValue(1);

    // State for Floating Arrows
    const [arrows, setArrows] = useState<FloatingArrowItem[]>([]);

    // Mock Global Clicks
    const [globalClicks, setGlobalClicks] = useState(8848130);

    // Auto-increment global clicks
    useEffect(() => {
        const interval = setInterval(() => {
            setGlobalClicks(prev => prev + Math.floor(Math.random() * 5));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const removeArrow = useCallback((id: number) => {
        setArrows(prev => prev.filter(arrow => arrow.id !== id));
    }, []);

    const handleKnock = () => {
        incrementFaith();
        setGlobalClicks(prev => prev + 1);

        // Haptics
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Fish Scale Animation
        scale.value = withSequence(
            withTiming(0.95, { duration: 50 }),
            withSpring(1, { damping: 10, stiffness: 300 })
        );

        // Add Floating Arrow
        const newArrow: FloatingArrowItem = {
            id: Date.now() + Math.random(),
            x: 0, // Position handled in CSS/Style relative to parent
            y: 0
        };
        setArrows(prev => [...prev, newArrow]);
    };

    const fishAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>信仰充值</Text>
                <Text style={styles.headerSubtitle}>功德 +1 · 信仰 +1</Text>
            </View>

            {/* My Merit - Top Center & Large */}
            <View style={styles.meritContainer}>
                <Text style={styles.meritLabel}>我的功德</Text>
                <Text style={styles.meritValue}>
                    {faithClicks.toLocaleString()}
                </Text>
            </View>

            <View style={styles.fishContainer}>
                {/* Floating Arrows Layer */}
                <View style={styles.arrowLayer} pointerEvents="none">
                    {arrows.map(arrow => (
                        <FloatingArrow key={arrow.id} onComplete={() => removeArrow(arrow.id)} />
                    ))}
                </View>

                {/* Wooden Fish */}
                <Animated.View style={fishAnimatedStyle}>
                    <TouchableOpacity
                        activeOpacity={1} // Handled by Reanimated scale
                        onPress={handleKnock}
                    >
                        <Image
                            source={WOODEN_FISH_IMAGE}
                            style={{ width: 280, height: 280 }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <View style={styles.footerContainer}>
                {/* Network Accumulation - Bottom Box */}
                <View style={styles.globalStatsBox}>
                    <View style={styles.globalStatsRow}>
                        <Text style={styles.globalStatsLabel}>全網累積</Text>
                        <Text style={styles.globalStatsValue}>{globalClicks.toLocaleString()}</Text>
                    </View>
                </View>

                <Text style={styles.footerNote}>
                    每敲擊一次，都在為牛市的到來注入一點念力。
                </Text>
            </View>

            <TouchableOpacity
                onPress={resetOnboarding}
                style={styles.devButton}
            >
                <Text style={styles.devButtonText}>RESET ONBOARDING (DEV)</Text>
            </TouchableOpacity>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // bg-black
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 40, // py-10
    },
    header: {
        alignItems: 'center',
        marginTop: 32, // mt-8
    },
    headerTitle: {
        color: '#FFFFFF', // text-white
        fontSize: 36, // text-4xl
        fontWeight: '900', // font-black
        fontStyle: 'italic',
        letterSpacing: -1, // tracking-tighter
        marginBottom: 4,
    },
    headerSubtitle: {
        color: '#71717A', // zinc-500
        fontWeight: '700', // font-bold
        textTransform: 'uppercase',
        letterSpacing: 3, // tracking-widest
        fontSize: 12, // text-xs
    },
    meritContainer: {
        alignItems: 'center',
        paddingVertical: 24, // py-6
    },
    meritLabel: {
        color: '#71717A', // zinc-500
        fontWeight: '700', // font-bold
        fontSize: 12, // text-xs
        textTransform: 'uppercase',
        marginBottom: 8, // mb-2
        letterSpacing: 3, // tracking-widest
    },
    meritValue: {
        color: '#F97316', // orange-500
        fontWeight: '900', // font-black
        fontSize: 60, // text-6xl
        letterSpacing: -2, // tracking-tighter
    },
    fishContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
    },
    arrowLayer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 20,
    },
    footerContainer: {
        width: '100%',
        paddingHorizontal: 32, // px-8
        paddingBottom: 16, // pb-4
    },
    globalStatsBox: {
        backgroundColor: '#18181B', // zinc-900
        borderRadius: 16, // rounded-2xl
        padding: 24, // p-6
        borderWidth: 1,
        borderColor: '#27272A', // zinc-800
        marginBottom: 16, // mb-4
    },
    globalStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    globalStatsLabel: {
        color: '#71717A', // zinc-500
        fontWeight: '700', // font-bold
        fontSize: 12, // text-xs
        textTransform: 'uppercase',
    },
    globalStatsValue: {
        color: '#FFFFFF', // text-white
        fontWeight: '700', // font-bold
        fontSize: 18, // text-lg
    },
    footerNote: {
        color: '#3F3F46', // zinc-700
        fontSize: 12, // text-xs
        textAlign: 'center',
        fontWeight: '700', // font-bold
    },
    devButton: {
        marginBottom: 8,
        padding: 8,
    },
    devButtonText: {
        color: '#27272A', // zinc-800
        fontSize: 10,
        fontWeight: '700', // font-bold
        textTransform: 'uppercase',
    },
});
