import dynamic from 'next/dynamic'
import { SectionShell } from '@/components/section-shell'

const NewsPageClient = dynamic(
  () => import('@/components/news/news-page-client').then((module) => module.NewsPageClient),
  {
    ssr: false,
    loading: () => <div className="text-center">Finding the latest actuarial news...</div>
  }
)

export default function NewsPage() {
  return (
    <SectionShell title="News" description="Current affairs, academic context and study-relevant developments to keep your learning connected.">
      <NewsPageClient />
    </SectionShell>
  )
}

