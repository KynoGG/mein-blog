import { Suspense } from 'react';
import { getAllPosts } from '@/lib/posts';
import SucheClient from './SucheClient';

export default function SearchPage() {
  const allPosts = getAllPosts();
  return (
    <Suspense>
      <SucheClient allPosts={allPosts} />
    </Suspense>
  );
}
