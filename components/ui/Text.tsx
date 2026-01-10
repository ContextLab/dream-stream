import { Text as RNText, TextProps as RNTextProps } from 'react-native';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'label';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success' | 'inherit';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

const variantStyles: Record<TextVariant, string> = {
  h1: 'text-4xl leading-tight',
  h2: 'text-3xl leading-tight',
  h3: 'text-2xl leading-snug',
  h4: 'text-xl leading-snug',
  body: 'text-base leading-relaxed',
  bodySmall: 'text-sm leading-relaxed',
  caption: 'text-xs leading-normal',
  label: 'text-sm leading-normal uppercase tracking-wide',
};

const weightStyles: Record<TextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorStyles: Record<string, string> = {
  primary: 'text-gray-900 dark:text-white',
  secondary: 'text-gray-600 dark:text-gray-300',
  muted: 'text-gray-400 dark:text-gray-500',
  error: 'text-red-500',
  success: 'text-green-500',
  inherit: '',
};

const alignStyles: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const defaultWeights: Record<TextVariant, TextWeight> = {
  h1: 'bold',
  h2: 'bold',
  h3: 'semibold',
  h4: 'semibold',
  body: 'normal',
  bodySmall: 'normal',
  caption: 'normal',
  label: 'medium',
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
      className={`${variantStyles[variant]} ${weightStyles[resolvedWeight]} ${colorStyles[color]} ${alignStyles[align]}`}
      style={style}
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
