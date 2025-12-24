import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function TechConfigScreen() {
    const router = useRouter();

    return (
        <StyledView className="flex-1 bg-black p-6 pt-12">
            <StyledView className="flex-row items-center justify-between mb-8">
                <StyledTouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center">
                    <Ionicons name="close" size={20} color="white" />
                </StyledTouchableOpacity>
                <StyledText className="text-zinc-500 font-bold tracking-[0.2em] text-xs">TECH CONFIG</StyledText>
                <StyledView className="w-10" />
            </StyledView>

            <StyledView className="flex-1 items-center justify-center opacity-50">
                <Ionicons name="construct-outline" size={48} color="#52525b" />
                <StyledText className="text-zinc-600 mt-4 text-xs font-bold tracking-widest uppercase">Module Offline</StyledText>
            </StyledView>
        </StyledView>
    );
}
