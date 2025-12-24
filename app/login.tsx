import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuthStore();

    const handleLogin = () => {
        login();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Background Elements */}
            <View style={styles.backgroundArc} />

            <View style={styles.logoContainer}>
                <View style={styles.iconContainer}>
                    <Ionicons name="finger-print-outline" size={48} color="white" />
                </View>
                <Text style={styles.title}>Believer</Text>
                <Text style={styles.subtitle}>Perception System V1.4</Text>
            </View>

            <View style={styles.formContainer}>
                {/* Mock Login Form */}
                <View style={styles.inputCard}>
                    <View style={styles.inputField}>
                        <Text style={styles.placeholderText}>Enter Access Key...</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleLogin}
                        style={styles.loginButton}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.loginButtonText}>ACCESS SYSTEM</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.guestButton}>
                    <Text style={styles.guestButtonText}>Guest Mode (Read Only)</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>System Security Level: High</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        position: 'relative',
    },
    backgroundArc: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(24, 24, 27, 0.2)', // zinc-900/20
        borderBottomLeftRadius: 100,
        borderBottomRightRadius: 100,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 64,
    },
    iconContainer: {
        width: 96,
        height: 96,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        // shadowColor: 'rgba(59, 130, 246, 0.2)', // Blue shadow not supported same way in simple obj
    },
    title: {
        color: '#FFFFFF',
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: -2, // tracking-tighter
        marginBottom: 8,
    },
    subtitle: {
        color: '#D4D4D8', // zinc-300
        fontSize: 14,
        letterSpacing: 3, // tracking-[0.2em]
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    formContainer: {
        width: '100%',
        gap: 16,
    },
    inputCard: {
        backgroundColor: 'rgba(24, 24, 27, 0.5)', // zinc-900/50
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A', // zinc-800
        gap: 16,
    },
    inputField: {
        height: 48,
        backgroundColor: '#27272A', // zinc-800
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#3F3F46', // zinc-700
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    placeholderText: {
        color: '#D4D4D8', // zinc-300
    },
    loginButton: {
        backgroundColor: '#FFFFFF',
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonText: {
        color: '#000000',
        fontWeight: '900',
        fontSize: 18,
    },
    guestButton: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    guestButtonText: {
        color: '#A1A1AA', // zinc-400
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 48,
    },
    footerText: {
        color: '#71717A', // zinc-500
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
