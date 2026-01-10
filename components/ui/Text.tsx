import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, fontFamily } from '@/theme/tokens';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'label' | 'mono' | 'code';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'accent' | 'inherit';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

const variantStyles = StyleSheet.create({
  h1: { fontSize: 35, lineHeight: 42, letterSpacing: -0.5, fontFamily: fontFamily.bold },
  h2: { fontSize: 29, lineHeight: 36, letterSpacing: -0.3, fontFamily: fontFamily.bold },
  h3: { fontSize: 23, lineHeight: 30, letterSpacing: -0.2, fontFamily: fontFamily.bold },
  h4: { fontSize: 19, lineHeight: 26, letterSpacing: -0.1, fontFamily: fontFamily.regular },
  body: { fontSize: 15, lineHeight: 24, fontFamily: fontFamily.regular },
  bodySmall: { fontSize: 13, lineHeight: 20, fontFamily: fontFamily.regular },
  caption: { fontSize: 11, lineHeight: 16, letterSpacing: 0.2, fontFamily: fontFamily.regular },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: fontFamily.bold },
  mono: { fontSize: 14, lineHeight: 22, fontFamily: fontFamily.regular },
  code: { fontSize: 13, lineHeight: 20, fontFamily: fontFamily.regular, letterSpacing: -0.3 },
});

const fontFamilyForWeight: Record<TextWeight, string> = {
  normal: fontFamily.regular,
  medium: fontFamily.regular,
  semibold: fontFamily.bold,
  bold: fontFamily.bold,
};

const weightStyles = StyleSheet.create({
  normal: { fontFamily: fontFamily.regular },
  medium: { fontFamily: fontFamily.regular },
  semibold: { fontFamily: fontFamily.bold },
  bold: { fontFamily: fontFamily.bold },
});

const colorMap = {
  primary: colors.gray[50],
  secondary: colors.gray[400],
  muted: colors.gray[600],
  error: colors.error,
  success: colors.success,
  accent: colors.primary[400],
  inherit: undefined,
};

const alignMap = {
  left: 'left' as const,
  center: 'center' as const,
  right: 'right' as const,
};

const defaultWeights: Record<TextVariant, TextWeight> = {
  h1: 'bold',
  h2: 'bold',
  h3: 'semibold',
  h4: 'medium',
  body: 'normal',
  bodySmall: 'normal',
  caption: 'normal',
  label: 'medium',
  mono: 'normal',
  code: 'normal',
};

export function Text({
  variant = 'body',
  weight,
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}: TextProps) {
  const resolvedWeight = weight ?? defaultWeights[variant];

  return (
    <RNText
      style={[
        variantStyles[variant],
        weightStyles[resolvedWeight],
        { color: colorMap[color], textAlign: alignMap[align] },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

export function Heading({ variant = 'h2', ...props }: Omit<TextProps, 'variant'> & { variant?: 'h1' | 'h2' | 'h3' | 'h4' }) {
  return <Text variant={variant} {...props} />;
}

export function Paragraph(props: Omit<TextProps, 'variant'>) {
  return <Text variant="body" {...props} />;
}

export function Caption(props: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" color="secondary" {...props} />;
}

export function MonoText(props: Omit<TextProps, 'variant'>) {
  return <Text variant="mono" {...props} />;
}

export function Code(props: Omit<TextProps, 'variant'>) {
  return <Text variant="code" color="accent" {...props} />;
}
