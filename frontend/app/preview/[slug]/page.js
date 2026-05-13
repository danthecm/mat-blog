import SingleBlog from '@/src/components/pages/SingleBlog/SingleBlog';
import axios from 'axios';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}blogs/${slug}/`);
    const blog = res.data;

    return {
      title: `[PREVIEW] ${blog.title}`,
      description: blog.content ? blog.content.substring(0, 160).replace(/<[^>]*>/g, '') : '',
      robots: {
        index: false,
        follow: false,
      },
      openGraph: {
        title: `[PREVIEW] ${blog.title}`,
        description: blog.content ? blog.content.substring(0, 160).replace(/<[^>]*>/g, '') : '',
        type: 'article',
        images: [
          {
            url: blog.image || '/og-image.png',
            width: 1200,
            height: 630,
            alt: blog.title,
          },
        ],
      },
    };
  } catch (error) {
    return {
      title: 'Preview Not Found',
    };
  }
}

export default function Page() {
  return <SingleBlog isPreview={true} />;
}
