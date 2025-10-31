// icon-symbols.tsx

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome'; // Keep this import
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// --- Step 1: Update the Mapping structure ---
// It now needs to know *which* library to use
type IconMapping = Record<
  string,
  {
    library: 'MaterialIcons' | 'FontAwesome';
    name:
      | ComponentProps<typeof MaterialIcons>['name']
      | ComponentProps<typeof FontAwesome>['name'];
  }
>;

type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material/FontAwesome Icons mappings here.
 */
const MAPPING = {
  // --- Your old icons, now pointing to MaterialIcons ---
  'house.fill': {
    library: 'MaterialIcons',
    name: 'home',
  },
  // --- Step 2: Add your NEW icon ---
  // I've picked a matching SF Symbol name for 'list-alt'
  'list.bullet': {
    library: 'FontAwesome',
    name: 'list-alt',
  },
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material/FontAwesome on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // --- Step 3: Add logic to pick the right component ---
  const mapping = MAPPING[name];

  if (mapping.library === 'FontAwesome') {
    return (
      <FontAwesome
        color={color}
        size={size}
        // We cast 'name' because TypeScript can't tell it's a FontAwesome name
        name={mapping.name as ComponentProps<typeof FontAwesome>['name']}
        style={style}
      />
    );
  }

  // Default to MaterialIcons for all other mappings
  return (
    <MaterialIcons
      color={color}
      size={size}
      // We cast 'name' because TypeScript can't tell it's a MaterialIcons name
      name={mapping.name as ComponentProps<typeof MaterialIcons>['name']}
      style={style}
    />
  );
}