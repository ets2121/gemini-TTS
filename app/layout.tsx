import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ToastProvider } from '@/components/ToastManager';
import { ElectronSettings } from '@/components/ElectronSettings';

export const metadata: Metadata = {
  title: 'AI TTS Generator - Voice Synthesis & Storage',
  description: 'AI Text to Speech Generator with neural voice styles, waveform visualizer, audio downloads, and persistent history storage.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0C] text-[#E2E2E2] antialiased selection:bg-teal-600/30 selection:text-teal-200" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
        <ElectronSettings />
      </body>
    </html>
  );
}

