export type HelpTopic = {
  id: string
  title: string
  summary: string
  answer: string
  keywords: string[]
  relatedRoutes: string[]
  sampleQuestions: string[]
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'getting-started',
    title: 'Getting started with Storyline',
    summary: 'Quick overview of the main project tabs and how to begin your story.',
    answer:
      'Start in the Story tab to write or edit scenes. Use Characters, Ideas, Locations, and Objects to build your story world. The AI Partner tab is for creative assistance, and AI Memory stores your past AI outputs for later reuse.',
    keywords: ['story', 'start', 'beginner', 'project tabs', 'workflow'],
    relatedRoutes: ['/story', '/characters', '/ideas', '/locations', '/objects', '/ai'],
    sampleQuestions: [
      'How do I start a new story?',
      'What are the main tabs for?',
      'Where do I write my scenes?'
    ]
  },
  {
    id: 'add-character',
    title: 'How do I add a character?',
    summary: 'Add and manage characters so your story stays organized.',
    answer:
      'Open the Characters tab and use the Add button to create a new character. Give each character a name, description, and role, then link them to scenes in the Story tab as you write.',
    keywords: ['character', 'add character', 'characters tab', 'cast', 'people'],
    relatedRoutes: ['/characters'],
    sampleQuestions: ['How do I create a character?', 'Where do I manage characters?', 'How do I add new people to my story?']
  },
  {
    id: 'use-ideas',
    title: 'How do I save and reuse ideas?',
    summary: 'Store ideas for later use and link them into scenes.',
    answer:
      'The Ideas tab is where you keep story beats, prompts, and inspiration. Save an idea there, then copy or reference it while writing scenes in the Story tab.',
    keywords: ['ideas', 'idea', 'brainstorm', 'reuse', 'prompts'],
    relatedRoutes: ['/ideas'],
    sampleQuestions: ['How do I keep my ideas?', 'Where do I store story ideas?', 'How do I use saved ideas?']
  },
  {
    id: 'use-locations',
    title: 'How do I manage locations and worldbuilding?',
    summary: 'Use Locations to track settings, places, and scene environments.',
    answer:
      'Open the Locations tab to add places, worldbuilding notes, and scene-setting details. You can refer back to these locations as you edit scenes in the Story tab.',
    keywords: ['locations', 'worldbuilding', 'setting', 'place', 'map'],
    relatedRoutes: ['/locations'],
    sampleQuestions: ['How do I add a place?', 'Where do I save settings?', 'How do I track locations?']
  },
  {
    id: 'use-objects',
    title: 'How do I track objects and important items?',
    summary: 'Store objects and props that matter to your story.',
    answer:
      'The Objects tab is for important items, props, or artifacts. Add each object with a description and refer back to it while writing scenes to keep story details consistent.',
    keywords: ['objects', 'props', 'items', 'inventory', 'artifact'],
    relatedRoutes: ['/objects'],
    sampleQuestions: ['How do I add an object?', 'Where do I store props?', 'How do I keep track of items?']
  },
  {
    id: 'ai-partner',
    title: 'How do I use the AI Partner?',
    summary: 'Ask the AI Partner for writing help, scene analysis, and creative suggestions.',
    answer:
      'Use the AI Partner tab to ask writing questions, sharpen dialogue, and explore story ideas. On the Story page, you can also click the AI button to analyze the current scene.',
    keywords: ['ai', 'AI Partner', 'assistant', 'analysis', 'suggestions'],
    relatedRoutes: ['/ai', '/story'],
    sampleQuestions: ['What can the AI Partner do?', 'How do I ask the AI for help?', 'Why is the AI Partner useful?']
  },
  {
    id: 'ai-memory',
    title: 'What is AI Memory?',
    summary: 'Keep and reuse previous AI results for future writing sessions.',
    answer:
      'AI Memory stores past AI-generated responses so you can revisit, copy, or build on them later. Use the AI Memory tab to recover helpful outputs without having to regenerate them.',
    keywords: ['memory', 'AI Memory', 'saved responses', 'history', 'reuse'],
    relatedRoutes: ['/archive'],
    sampleQuestions: ['What is AI memory?', 'Where are old AI responses stored?', 'How do I reuse previous AI output?']
  },
  {
    id: 'export-project',
    title: 'How do I export my project?',
    summary: 'Export your story contents for backup or external editing.',
    answer:
      'Use the Export option from the project header menu to download your story and project data. This is useful for backups or moving your work into another writing tool.',
    keywords: ['export', 'download', 'backup', 'save', 'share'],
    relatedRoutes: ['/story', '/settings'],
    sampleQuestions: ['How do I export my story?', 'Can I download my project?', 'How do I save a backup?']
  },
  {
    id: 'project-recovery',
    title: 'How do I recover lost work?',
    summary: 'Use recovery tools to restore unsaved or missing story content.',
    answer:
      'If you lose content, open the Recovery tab to see autosaved history and snapshots. Recovery helps restore text when a scene was accidentally deleted or overwritten.',
    keywords: ['recovery', 'restore', 'lost', 'undo', 'history'],
    relatedRoutes: ['/recovery'],
    sampleQuestions: ['How do I recover a scene?', 'Where is recovery?', 'Can I restore lost text?']
  },
  {
    id: 'shortcuts',
    title: 'Where are keyboard shortcuts?',
    summary: 'Quickly access keyboard shortcuts and navigation help.',
    answer:
      'Press ? while not typing to open the shortcuts panel. The panel lists navigation keys, editor tools, and other quick commands to speed up your workflow.',
    keywords: ['shortcuts', 'keyboard', 'hotkeys', 'commands'],
    relatedRoutes: ['/story'],
    sampleQuestions: ['How do I see keyboard shortcuts?', 'What hotkeys are available?', 'How do I navigate quickly?']
  }
]

export function matchHelpTopics(query: string, topics: HelpTopic[]) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return topics
  }

  const tokens = normalizedQuery.split(/\W+/).filter(Boolean)

  return topics
    .map((topic) => {
      let score = 0
      const title = topic.title.toLowerCase()
      const answer = topic.answer.toLowerCase()
      const summary = topic.summary.toLowerCase()

      if (title.includes(normalizedQuery)) score += 20
      if (answer.includes(normalizedQuery)) score += 8
      if (summary.includes(normalizedQuery)) score += 4

      for (const keyword of topic.keywords) {
        const normalizedKeyword = keyword.toLowerCase()
        if (normalizedKeyword === normalizedQuery) {
          score += 24
        } else if (normalizedKeyword.includes(normalizedQuery) || normalizedQuery.includes(normalizedKeyword)) {
          score += 16
        } else if (tokens.some((token) => normalizedKeyword.includes(token))) {
          score += 8
        }
      }

      for (const question of topic.sampleQuestions) {
        const normalizedQuestion = question.toLowerCase()
        if (normalizedQuestion.includes(normalizedQuery)) {
          score += 10
        }
      }

      return { topic, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.topic)
}
