import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styled } from 'nativewind';
import { Text, TouchableOpacity, View } from 'react-native';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuthStore();

    const handleLogin = async () => {
        try {
            await login();
            router.replace('/');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <StyledView className="flex-1 bg-black items-center justify-center p-6">
            <StyledView className="items-center mb-12">
                <Ionicons name="finger-print-outline" size={64} color="white" />
                <StyledText className="text-white text-3xl font-black tracking-widest mt-6">BELIEVER</StyledText>
                <StyledText className="text-zinc-500 text-xs font-bold tracking-[0.3em] uppercase mt-2">Chaos Intelligence</StyledText>
            </StyledView>

            <StyledTouchableOpacity
                onPress={handleLogin}
                className="w-full bg-white h-14 rounded-full items-center justify-center flex-row gap-2 active:opacity-90"
            >
                <StyledText className="text-black font-bold text-sm tracking-widest">Connect Wallet</StyledText>
                <Ionicons name="arrow-forward" size={20} color="black" />
            </StyledTouchableOpacity>

            <StyledText className="text-zinc-700 text-[10px] mt-8 text-center leading-4">
                By connecting, you agree to accept the fluctuating nature of reality.
            </StyledText>
        </StyledView>
    );
}
