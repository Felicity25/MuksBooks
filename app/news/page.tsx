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
    <SectionShell title="Actuarial News" description="Daily actuarial, insurance, risk and financial intelligence.">
      <NewsPageClient />
    </SectionShell>
  )
}

