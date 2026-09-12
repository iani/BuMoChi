import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DanceStage } from './dance/DanceStage.tsx'
import { DANCE_ROUTE_HASH } from './dance/route.ts'

const root = document.getElementById('root')
if (root === null) {
  throw new Error('#root missing')
}

const isDanceRoute = (): boolean => window.location.hash === DANCE_ROUTE_HASH
const render = (): void => {
  reactRoot.render(<StrictMode>{isDanceRoute() ? <DanceStage /> : <App />}</StrictMode>)
}
const reactRoot = createRoot(root)
window.addEventListener('hashchange', render)
render()
