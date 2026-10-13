import { useEffect, useState } from 'react'
import { Header, Hero, Footer } from './components/Layout.jsx'
import ProjectCard from './components/ProjectCard.jsx'
import { projects, hardProblems } from './data/projects.js'

export default function App() {
  const [activeId, setActiveId] = useState(projects[0].id)

  /**
   * Section highlighting for the nav. IntersectionObserver with a mid-screen
   * root margin is the cheap way to answer "which project am I looking at".
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveId(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    for (const project of projects) {
      const el = document.getElementById(project.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-full bg-ink-950">
      <Header activeId={activeId} />
      <Hero />

      <main className="mx-auto max-w-6xl space-y-16 px-5 pb-4">
        {projects.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            problems={hardProblems}
          />
        ))}
      </main>

      <Footer />
    </div>
  )
}
