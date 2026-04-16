import React from "react";
import {View, Text, TouchableOpacity, Linking} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {useTheme} from "@/hooks/use-theme";

export const Footer: React.FC = () => {
    const { colors } = useTheme();

    const openPortfolio = () => {
        Linking.openURL('https://nyainafitiavana-portfolio.vercel.app/').catch(err =>
            console.error('Erreur ouverture portfolio:', err)
        );
    };

    const openEmail = () => {
        Linking.openURL('mailto:ainafitiavana.project@gmail.com').catch(err =>
            console.error('Erreur ouverture email:', err)
        );
    };

    return (
        <View className="px-4 pt-6 pb-8">
            <View className="p-5 rounded-xl mx-2" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                {/* Icône développeur */}
                <View className="items-center mb-3">
                    <View className="w-12 h-12 rounded-full items-center justify-center mb-2" style={{ backgroundColor: `${colors.primary}15` }}>
                        <MaterialIcons name="code" size={24} color={colors.primary} />
                    </View>
                </View>

                <Text className="text-sm font-semibold text-center mb-2" style={{ color: colors.text }}>
                    Développé par
                </Text>

                <Text className="text-base font-bold text-center mb-1" style={{color: colors.primary}}>
                    FITAHIANTSOA Ny Aina Fitiavana
                </Text>

                <Text className="text-xs text-center mb-3" style={{ color: colors.textSecondary }}>
                    © 2026 BudgetFlow - Tous droits réservés
                </Text>

                <View className="h-px my-2" style={{ backgroundColor: colors.border }} />

                <View className="flex-row justify-center space-x-4 gap-4 mt-2">
                    <TouchableOpacity onPress={openEmail} className="items-center">
                        <MaterialIcons name="email" size={20} color={colors.primary} />
                        <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={openPortfolio} className="items-center">
                        <MaterialIcons name="public" size={20} color={colors.primary} />
                        <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>Portfolio</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}