import AuthorProfile from '@/src/components/pages/AuthorProfile/AuthorProfile';
import axios from 'axios';

export async function generateMetadata({ params }) {
  const { username } = await params;
  try {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}users/${username}/`);
    const profile = res.data;

    const title = profile.display_name || profile.username;

    return {
      title: `${title}'s Profile`,
      description: profile.profile?.bio || `View ${title}'s contributions and stories on CM Blog.`,
      alternates: {
        canonical: `/author/${username}`,
      },
      openGraph: {
        title: `${title} on CM Blog`,
        description: profile.profile?.bio || `View ${title}'s contributions and stories on CM Blog.`,
        url: `/author/${username}`,
        siteName: 'CM Blog',
        type: 'profile',
        images: [
          {
            url: profile.profile?.avatar || '/og-image.png',
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
    };
  } catch (error) {
    return {
      title: 'Author Not Found',
    };
  }
}

export default async function Page({ params }) {
  const { username } = await params;
  return <AuthorProfile username={username} />;
}
