/**
 * Shared Clerk appearance so hosted Clerk widgets (sign-in, user button,
 * pricing table) match the app's dark design tokens instead of defaulting
 * to Clerk's light theme.
 */
export const clerkAppearance = {
  variables: {
    colorBackground: 'hsl(24 9% 7%)',
    colorPrimary: 'hsl(17 74% 50%)',
    colorText: 'hsl(36 30% 96%)',
    colorTextSecondary: 'hsl(30 10% 70%)',
    colorTextOnPrimaryBackground: 'hsl(24 40% 6%)',
    colorInputBackground: 'hsl(24 8% 10%)',
    colorInputText: 'hsl(36 30% 96%)',
    colorNeutral: 'hsl(36 30% 96%)',
    colorDanger: 'hsl(6 62% 55%)',
    colorSuccess: 'hsl(150 42% 46%)',
    colorWarning: 'hsl(38 86% 58%)',
    borderRadius: '0.875rem',
    fontFamily: "'Bricolage Grotesque', Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: '0.9375rem',
  },
  elements: {
    card: 'border border-border shadow-none',
    rootBox: 'w-full',
    footer: 'bg-transparent',
    headerTitle: 'font-display',
  },
};

