/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/PublicApp.tsx',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/LandingPage.tsx',
    './src/components/NewLandingPage.tsx',
    './src/components/ComparePlansModal.tsx',
    './src/components/ChatBotFAB.tsx',
    './src/components/HelpSalesChatBot.tsx',
    './src/components/PublicPropertyApp.tsx',
    './src/components/ConsultationModal.tsx',
    './src/components/LoadingSpinner.tsx',
    './src/components/Modal.tsx',
    './src/components/SEO.tsx',
    './src/components/StripeLogo.tsx',
    './src/components/ConversionWedge.tsx',
    './src/components/PlacementSection.tsx',
    './src/components/PricingSectionNew.tsx',
    './src/components/FaqSectionNew.tsx',
    './src/components/ProofSectionNew.tsx',
    './src/components/StatStripNew.tsx',
    './src/components/FinalCtaNew.tsx',
    './src/components/Logo.tsx',
    './src/components/LogoWithName.tsx',
    './src/components/FadeIn.tsx',
    './src/components/public/**/*.{js,ts,jsx,tsx}',
    './src/components/layout/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        },
        purple: {
          600: '#9333ea'
        },
        green: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a'
        }
      }
    }
  },
  plugins: []
};
