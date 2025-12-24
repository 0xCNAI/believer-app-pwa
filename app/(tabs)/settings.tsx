import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
    const router = useRouter();
    const { resetOnboarding } = useOnboardingStore();
    const { resetProfile, alertStyle, experience } = useUserStore();
    const { logout } = useAuthStore();

    const handleReset = async () => {
        resetProfile();
        await resetOnboarding();
        router.replace('/onboarding');
    };

    const handleLogout = () => {
        logout();
        // Auth protection in _layout will redirect to /login
    };

    // Helper to translate values
    const getExpLabel = (val: string | null) => {
        if (val === 'none') return '無交易經驗';
        if (val === '1-3_years') return '1-3 年';
        if (val === '5_plus_years') return '5 年以上';
        return '未設定';
    };

    const getAlertLabel = (val: string | null) => {
        if (val === 'early') return '較早感知';
        if (val === 'balanced') return '平衡風格';
        if (val === 'late') return '較晚提醒';
        return '未設定';
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.headerTitle}>設定</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>帳戶摘要</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>交易經驗</Text>
                            <Text style={styles.rowValue}>{getExpLabel(experience)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>提醒風格</Text>
                            <Text style={styles.rowValue}>{getAlertLabel(alertStyle)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.spacer} />

                <View style={styles.actionsContainer}>
                    <Text style={styles.actionTitle}>帳戶操作</Text>

                    <TouchableOpacity
                        onPress={handleLogout}
                        style={styles.logoutButton}
                    >
                        <Text style={styles.logoutText}>登出</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleReset}
                        style={styles.resetButton}
                    >
                        <Text style={styles.resetText}>重置開發數據</Text>
                    </TouchableOpacity>
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
    scrollContent: {
        padding: 24,
        paddingBottom: 50,
    },
    headerTitle: {
        color: '#71717a', // zinc-500
        fontWeight: 'bold',
        letterSpacing: 3, // tracking-widest
        textTransform: 'uppercase',
        marginBottom: 32,
        fontSize: 12,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20, // text-xl
        marginBottom: 16,
    },
    card: {
        backgroundColor: '#18181b', // zinc-900
        borderRadius: 12, // rounded-xl
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rowLabel: {
        color: '#a1a1aa', // zinc-400
    },
    rowValue: {
        color: '#fff',
        textTransform: 'capitalize',
    },
    spacer: {
        flex: 1,
    },
    actionsContainer: {
        marginTop: 40,
        paddingTop: 40,
        borderTopWidth: 1,
        borderTopColor: '#18181b', // zinc-900
        gap: 16,
    },
    actionTitle: {
        color: '#52525b', // zinc-600
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 12,
    },
    logoutButton: {
        backgroundColor: '#18181b', // zinc-900
        borderWidth: 1,
        borderColor: '#27272a', // zinc-800
        padding: 16,
        borderRadius: 12, // rounded-xl
        alignItems: 'center',
    },
    logoutText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    resetButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // red-500/10
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)', // red-500/30
        padding: 16,
        borderRadius: 12, // rounded-xl
        alignItems: 'center',
        marginTop: 16,
    },
    resetText: {
        color: '#ef4444', // red-500
        fontWeight: 'bold',
    },
});
