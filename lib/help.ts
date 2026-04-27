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
    id: 'cloud-sync',
    title: 'How does Cloud Sync work?',
    summary: 'Understand what cloud sync is, when to use it, and how to turn it on for one project.',
    answer:
      'Cloud Sync makes one specific project available on your other devices and unlocks sharing features for that project.\n\nHere is the simple version:\n- A local project lives only on the device where you created it.\n- Turning on Cloud Sync uploads that project so you can open it elsewhere with the same account.\n- This does not happen automatically for every project. You choose it per project.\n\nHow to turn it on:\n1. Open the project you want to use on other devices.\n2. Open Project Settings.\n3. Choose Enable Cloud & Collaboration.\n4. Confirm the upload.\n\nWhat happens next:\n- Your project is copied to the cloud for cross-device access.\n- Your local version stays behind as a backup.\n- Collaboration tools like sharing and viewer feedback become available for that cloud-synced project.\n\nIf you do not want cloud sync:\nUse Export Backup on one device, then Import Backup on the other. That keeps the project local-only while still letting you move it manually.',
    keywords: ['cloud sync', 'sync', 'devices', 'another device', 'backup', 'local project', 'collaboration', 'enable cloud', 'upload to cloud'],
    relatedRoutes: [],
    sampleQuestions: [
      'How do I enable cloud sync?',
      'Why is my project only on this device?',
      'What is the difference between local and cloud sync?'
    ]
  },
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
    id: 'structure-panel',
    title: 'How do I use the Structure panel?',
    summary: 'Organize chapters, acts, and scenes from the Structure panel.',
    answer:
      'Open the Structure panel next to the Story button to see your project outline. Use it to add chapters, acts, and scenes, rename sections, drag and reorder story beats, and jump instantly to any scene. The virtual root lets you select the entire project while each node lets you focus on one scene or section in the editor.',
    keywords: ['structure', 'outline', 'chapters', 'scenes', 'reorder', 'sidebar', 'project structure'],
    relatedRoutes: ['/story'],
    sampleQuestions: ['How do I use the structure panel?', 'Where is my story outline?', 'How do I reorder scenes?']
  },
  {
    id: 'story-editor-formatting',
    title: 'What do the story editor formatting controls do?',
    summary: 'Format text and use rich editor tools while writing scenes.',
    answer:
      'In novel mode, the editor toolbar gives you text formatting such as bold, italic, underline, strikethrough, highlight, headings, bullet lists, numbered lists, and block quotes. Select text to reveal the floating toolbar and apply formatting to improve readability and structure.',
    keywords: ['formatting', 'toolbar', 'bold', 'italic', 'heading', 'list', 'blockquote', 'editor'],
    relatedRoutes: ['/story'],
    sampleQuestions: ['How do I format text?', 'What do the toolbar buttons do?', 'How do I add headings and lists?']
  },
  {
    id: 'screenplay-toolbar',
    title: 'How does screenplay mode work?',
    summary: 'Use screenplay-specific block types for structured script writing.',
    answer:
      'Screenplay mode provides structured blocks like scene heading, action, character, parenthetical, dialogue, and transition. These block types keep your script in the correct screenplay format and let you move through scenes quickly using the screenplay toolbar and keyboard navigation.',
    keywords: ['screenplay', 'screenplay mode', 'scene heading', 'dialogue', 'parenthetical', 'transition', 'structured writing'],
    relatedRoutes: ['/story'],
    sampleQuestions: ['How do I write a screenplay?', 'What are scene headings and dialogue blocks?', 'How do I use screenplay mode?']
  },
  {
    id: 'read-aloud-feedback',
    title: 'How do I use read-aloud and feedback tools?',
    summary: 'Listen to your story and leave inline feedback while editing.',
    answer:
      'Use the read-aloud controls to hear scenes played back, which is perfect for checking pacing, tone, and dialogue. The feedback tools let you insert comments, highlight passages, and review inline notes while editing. Dictation also allows you to speak directly into the editor for faster drafting.',
    keywords: ['read aloud', 'reader', 'dictation', 'feedback', 'comments', 'review', 'listen'],
    relatedRoutes: ['/story'],
    sampleQuestions: ['How do I hear my story read aloud?', 'Where do I leave feedback?', 'How do I dictate text?']
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
    id: 'project-assets',
    title: 'How do I use Assets?',
    summary: 'Upload images to your project and reuse them across scenes and story details.',
    answer:
      'Open the Assets tab to upload and organize project images. Assets give you a shared visual library for your project, so you can keep reference art, inspiration, and story images in one place. After uploading, you can link assets to scenes or attach them to characters, locations, and objects wherever visual reference helps.',
    keywords: ['assets', 'images', 'upload', 'gallery', 'reference art', 'visuals', 'asset manager'],
    relatedRoutes: ['/assets'],
    sampleQuestions: ['How do I upload images?', 'Where do I manage project assets?', 'How do I attach an image to a scene?']
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
    relatedRoutes: [],
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
