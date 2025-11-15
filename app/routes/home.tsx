import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Liquida AP' },
    { name: 'description', content: 'Ap 72 ta acabando... que triste!' },
  ]
}

export default function Home() {
  return (
    <div className="h-screen flex justify-center items-center text-3xl">
      Comming soon!
    </div>
  )
}
