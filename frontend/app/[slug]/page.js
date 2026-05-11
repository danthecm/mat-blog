import SingleBlog from '@/src/components/pages/SingleBlog/SingleBlog';
import axios from 'axios';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}blogs/${slug}/`);
    const blog = res.data;

    return {
      title: blog.title,
      description: blog.content ? blog.content.substring(0, 160).replace(/<[^>]*>/g, '') : '',
      alternates: {
        canonical: `/${slug}`,
      },
      openGraph: {
        title: blog.title,
        description: blog.content ? blog.content.substring(0, 160).replace(/<[^>]*>/g, '') : '',
        url: `/${slug}`,
        type: 'article',
        siteName: 'CM Blog',
        publishedTime: blog.created_at,
        authors: [blog.author_name],
        images: [
          {
            url: blog.image || '/og-image.png',
            width: 1200,
            height: 630,
            alt: blog.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: blog.title,
        description: blog.content ? blog.content.substring(0, 160).replace(/<[^>]*>/g, '') : '',
        images: [blog.image || '/og-image.png'],
      },
    };
  } catch (error) {
    return {
      title: 'Blog Post Not Found',
    };
  }
}

export default function Page() {
  return <SingleBlog />;
}
