import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface CustomModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
                                                            visible,
                                                            title,
                                                            message,
                                                            type = 'info',
                                                            onClose,
                                                        }) => {
    const { colors } = useTheme();

    const getIcon = () => {
        switch (type) {
            case 'success':
                return { name: 'check-circle', color: colors.success };
            case 'error':
                return { name: 'error', color: colors.error };
            case 'warning':
                return { name: 'warning', color: colors.warning };
            default:
                return { name: 'info', color: colors.primary };
        }
    };

    const icon = getIcon();

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View
                    className="w-80 rounded-2xl p-6 items-center"
                    style={{ backgroundColor: colors.background }}
                >
                    <View
                        className="w-16 h-16 rounded-full items-center justify-center mb-4"
                        style={{ backgroundColor: `${icon.color}15` }}
                    >
                        <MaterialIcons name={icon.name as any} size={32} color={icon.color} />
                    </View>

                    <Text className="text-xl font-bold mb-2 text-center" style={{ color: colors.text }}>
                        {title}
                    </Text>

                    <Text className="text-base mb-6 text-center" style={{ color: colors.textSecondary }}>
                        {message}
                    </Text>

                    <TouchableOpacity
                        onPress={onClose}
                        className="w-full py-3 rounded-xl"
                        style={{ backgroundColor: colors.primary }}
                    >
                        <Text className="text-white text-center font-semibold">OK</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};