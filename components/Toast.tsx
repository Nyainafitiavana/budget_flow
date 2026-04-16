// components/Toast.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface ToastProps {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({ visible, message, type, onHide }) => {
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Réinitialiser l'animation
            fadeAnim.setValue(0);
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.delay(2500),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                onHide();
            });
        }
    }, [visible, fadeAnim, onHide]);

    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'success': return colors.success;
            case 'error': return colors.error;
            case 'warning': return colors.warning;
            default: return colors.primary;
        }
    };

    return (
        <View
            style={{
                position: 'absolute',
                bottom: 80,
                left: 16,
                right: 16,
                zIndex: 9999,
                elevation: 10,
            }}
        >
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        }) }],
                }}
            >
                <View
                    className="rounded-xl p-4 flex-row items-center"
                    style={{ backgroundColor: getBgColor() }}
                >
                    <MaterialIcons name={getIcon() as any} size={24} color="white" />
                    <Text className="text-white font-semibold ml-2 flex-1">{message}</Text>
                </View>
            </Animated.View>
        </View>
    );
};