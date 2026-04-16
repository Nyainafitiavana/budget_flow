// components/ui/icon-symbol.tsx - Version mise à jour avec toutes les icônes
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'house': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',

  // Dashboard
  'chart.bar.fill': 'bar-chart',
  'chart.bar': 'bar-chart',
  'chart.pie.fill': 'pie-chart',
  'chart.pie': 'pie-chart',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'dollarsign.circle.fill': 'attach-money',
  'dollarsign.circle': 'attach-money',

  // Settings
  'gearshape.fill': 'settings',
  'gearshape': 'settings',
  'lock.fill': 'lock',
  'lock': 'lock',
  'arrow.down.doc.fill': 'file-download',
  'arrow.down.doc': 'file-download',
  'trash.fill': 'delete',
  'trash': 'delete',
  'person.fill': 'person',
  'person': 'person',

  // Budget
  'wallet.fill': 'wallet',
  'wallet': 'wallet',
  'creditcard.fill': 'credit-card',
  'creditcard': 'credit-card',
  'bag.fill': 'shopping-bag',
  'bag': 'shopping-bag',
  'cart.fill': 'shopping-cart',
  'cart': 'shopping-cart',

  // Actions
  'plus.circle.fill': 'add-circle',
  'plus.circle': 'add-circle',
  'minus.circle.fill': 'remove-circle',
  'minus.circle': 'remove-circle',
  'checkmark.circle.fill': 'check-circle',
  'checkmark.circle': 'check-circle',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.triangle': 'warning',

  // Time
  'calendar': 'calendar-today',
  'clock.fill': 'access-time',
  'clock': 'access-time',

  // Theme
  'sun.max.fill': 'wb-sunny',
  'sun.max': 'wb-sunny',
  'moon.fill': 'nightlight-round',
  'moon': 'nightlight-round',

  // Security
  'faceid': 'face',
  'touchid': 'fingerprint',

  // Export
  'square.and.arrow.up.fill': 'ios-share',
  'square.and.arrow.up': 'ios-share',
  'doc.fill': 'description',
  'doc': 'description',

  // Category icons
  'fork.knife': 'restaurant',
  'car.fill': 'directions-car',
  'car': 'directions-car',
  'gamecontroller.fill': 'sports-esports',
  'gamecontroller': 'sports-esports',
  'bed.double.fill': 'bed',
  'bed.double': 'bed',
  'stethoscope': 'local-hospital',
  'graduationcap.fill': 'school',
  'graduationcap': 'school',
  'gift.fill': 'card-giftcard',
  'gift': 'card-giftcard',
} as unknown as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
                             name,
                             size = 24,
                             color,
                             style,
                             weight,
                           }: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name];

  // Si l'icône n'est pas mappée, utiliser une icône par défaut
  if (!mappedName) {
    console.warn(`Icon "${name}" not mapped to Material Icon, using "help" as fallback`);
    return <MaterialIcons color={color} size={size} name="help" style={style} />;
  }

  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}