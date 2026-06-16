import { getAllPosts, getPostBySlug } from '@/lib/posts';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const categoryConfig = {
  fitness: { label: 'Fitness', emoji: '🏋️', color: 'cat-fitness' },
  ernaehrung: { label: 'Ernährung', emoji: '🥗', color: 'cat-ernaehrung' },
  gaming: { label: 'Gaming', emoji: '🎮', color: 'cat-gaming' },
  ki: { label: 'KI & Tech', emoji: '🤖', color: 'cat-ki' },
  lifestyle: { label: 'Lifestyle', emoji: '✨', color: 'cat-lifestyle' },
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({ params }) {
  const posts = getAllPosts();
  const postMeta = posts.find(p => p.slug === params.slug);
  if (!postMeta) notFound();

  const post = await getPostBySlug(postMeta.kategorie, params.slug);
  if (!post) notFound();

  const cat = categoryConfig[post.kategorie] || { label: post.kategorie, emoji: '📝', color: 'cat-lifestyle' };

  return (
    <main className="main-content">
      <article className="post-page">
        <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
        <header className="post-header">
          <span className={`cat-pill ${cat.color}`}>{cat.emoji} {cat.label}</span>
          <h1 className="post-title">{post.title}</h1>
          <div className="post-info">
            <span>{post.date}</span>
          </div>
        </header>
        <hr className="post-divider" />
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    </main>
  );
}