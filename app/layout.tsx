import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Text to Speech Studio - AI Voice Synthesis & SQLite Storage',
  description: 'Dark-mode Text to Speech studio with voice styles, audio waveform visualizer, audio downloads, and SQLite history storage.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0A0A0C] text-[#E2E2E2] antialiased selection:bg-teal-600/30 selection:text-teal-200" suppressHydrationWarning>{children}</body>
    </html>
  );
}
