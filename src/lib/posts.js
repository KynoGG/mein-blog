import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const contentDir = path.join(process.cwd(), 'content');

export function getAllPosts() {
  if (!fs.existsSync(contentDir)) return [];

  const categories = fs.readdirSync(contentDir).filter(f =>
    fs.statSync(path.join(contentDir, f)).isDirectory()
  );

  const posts = [];

  for (const category of categories) {
    const categoryPath = path.join(contentDir, category);
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);

      posts.push({
        slug: file.replace('.md', ''),
        kategorie: category,
        title: data.title || 'Kein Titel',
        date: data.date || '',
        excerpt: data.excerpt || content.slice(0, 120) + '...',
        ...data,
      });
    }
  }

  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getPostBySlug(kategorie, slug) {
  const filePath = path.join(contentDir, kategorie, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  const processed = await remark().use(html).process(content);
  const contentHtml = processed.toString();

  return {
    slug,
    kategorie,
    contentHtml,
    title: data.title || 'Kein Titel',
    date: data.date || '',
    excerpt: data.excerpt || '',
    ...data,
  };
}