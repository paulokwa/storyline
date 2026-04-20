import { notFound } from 'next/navigation'
import Showcase from '@/components/marketing/Showcase'

export default function DevShowcasePage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <Showcase />
}
