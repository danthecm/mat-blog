import ClientStateProvider from './StateProvider';
import NavBar from '@/src/components/common/Navbar';
import Footer from '@/src/components/common/Footer';
import ErrorBoundary from '@/src/components/common/ErrorBoundary';
import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'),
  title: {
    default: 'CM Blog | The Community Driven Publication',
    template: '%s | CM Blog'
  },
  description: 'Join a vibrant community of authors and readers. Explore trending stories, participate in polls, and share your insights with the world.',
  keywords: ['blog', 'community', 'newsroom', 'publication', 'articles', 'writing', 'journalism'],
  authors: [{ name: 'CM Blog Team' }],
  creator: 'CM Blog',
  publisher: 'CM Blog',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'CM Blog | The Community Driven Publication',
    description: 'The premier community-driven platform for modern journalism and storytelling.',
    url: '/',
    siteName: 'CM Blog',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CM Blog Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CM Blog',
    description: 'The Community Driven Publication',
    images: ['/og-image.png'],
    creator: '@cmblog',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  other: {
    'fb:app_id': 'your-fb-app-id', // Optional: Replace with actual ID if available
    'whatsapp:image': '/og-image.png',
  }
};

import MainWrapper from './MainWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
          integrity="sha512-KfkfwYDsLkIlwQp6LFnl8zNdLGxu9YAA1QvwINks4PhcElQSvqcyVLLD9aMhXd13uQjoXtEKNosOWaZqXgel0g=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-outfit antialiased selection:bg-primary selection:text-white">
        <ErrorBoundary>
          <ClientStateProvider>
            <MainWrapper>
              {children}
            </MainWrapper>
          </ClientStateProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
