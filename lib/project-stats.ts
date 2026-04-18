import { Database, NodeType } from '@/lib/supabase/types'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

export interface SceneStats {
    id: string
    nodeId: string
    title: string
    type: NodeType
    wordCount: number
    charCount: number
    readingTime: number
    hasSummary: boolean
    hasProse: boolean
    linkedCharactersCount: number
    linkedIdeasCount: number
    lastEdited: string | null
    isArchived: boolean
    parentTitle: string // Chapter/Act name
    sceneOrder: number
}

export interface ProjectStatsData {
    totalWords: number
    totalScenes: number
    totalChapters: number
    totalActs: number
    totalCharacters: number
    totalIdeas: number
    estimatedReadingTime: number
    avgWordsPerScene: number
    avgWordsPerChapter: number
    longestScene: { title: string; count: number }
    shortestScene: { title: string; count: number }
    longestChapter: { title: string; count: number }
    shortestChapter: { title: string; count: number }
    emptyScenesCount: number
    scenesWithSummaryCount: number
    scenesWithProseCount: number
    archivedScenesCount: number
    
    // Coverage
    percentProse: number
    percentSummary: number
    percentLinkedCharacters: number
    percentLinkedIdeas: number
    veryShortScenesCount: number
    veryLongScenesCount: number
    outlierChapters: { title: string; count: number; status: 'low' | 'high' }[]

    sceneBreakdown: SceneStats[]
}

// Simple Tiptap JSON to word count
export function getWordCount(json: any): number {
    if (!json || !json.content) return 0
    let text = ''
    
    const extractText = (content: any[]) => {
        content.forEach(node => {
            if (node.text) text += node.text + ' '
            if (node.content) extractText(node.content)
        })
    }
    
    extractText(json.content)
    return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function getCharCount(json: any): number {
    if (!json || !json.content) return 0
    let text = ''
    
    const extractText = (content: any[]) => {
        content.forEach(node => {
            if (node.text) text += node.text
            if (node.content) extractText(node.content)
        })
    }
    
    extractText(json.content)
    return text.length
}

export function calculateProjectStats(
    project: Project,
    nodes: StructureNode[],
    scenes: Scene[],
    assetCounts: { characters: number; ideas: number },
    links: { characters: any[]; ideas: any[] }
): ProjectStatsData {
    const sceneNodes = nodes.filter(n => n.type === 'scene' && !n.deleted_at)
    const chapterNodes = nodes.filter(n => (n.type === 'chapter' || n.type === 'episode') && !n.deleted_at)
    const actNodes = nodes.filter(n => n.type === 'act' && !n.deleted_at)

    const sceneDataMap = new Map<string, Scene>(scenes.map(s => [s.node_id, s]))
    
    const sceneStats: SceneStats[] = sceneNodes.map(node => {
        const scene = sceneDataMap.get(node.id)
        const wordCount = scene?.content ? getWordCount(scene.content) : 0
        const charCount = scene?.content ? getCharCount(scene.content) : 0
        const parent = nodes.find(n => n.id === node.parent_id)
        
        const linkedChars = links.characters.filter(l => l.scene_id === scene?.id).length
        const linkedIdeas = links.ideas.filter(l => l.scene_id === scene?.id).length

        return {
            id: scene?.id || '',
            nodeId: node.id,
            title: node.title,
            type: node.type as NodeType,
            wordCount,
            charCount,
            readingTime: Math.ceil(wordCount / 250),
            hasSummary: false, // We'll assume summary is separate or part of content
            hasProse: wordCount > 0,
            linkedCharactersCount: linkedChars,
            linkedIdeasCount: linkedIdeas,
            lastEdited: scene?.updated_at || null,
            isArchived: !!node.deleted_at,
            parentTitle: parent?.title || 'Unknown',
            sceneOrder: node.order_index
        }
    })

    const totalWords = sceneStats.reduce((acc, s) => acc + s.wordCount, 0)
    const avgWordsPerScene = sceneStats.length > 0 ? totalWords / sceneStats.length : 0

    // Chapter word counts
    const chapterStats = chapterNodes.map(chapter => {
        // Find all scenes under this chapter (recursively or just direct children depending on structure)
        // Usually its Chapter -> Scene or Chapter -> Act -> Scene
        const getSceneWords = (parentId: string): number => {
            let count = 0
            const children = nodes.filter(n => n.parent_id === parentId)
            for (const child of children) {
                if (child.type === 'scene') {
                    const stats = sceneStats.find(s => s.nodeId === child.id)
                    count += stats?.wordCount || 0
                } else {
                    count += getSceneWords(child.id)
                }
            }
            return count
        }
        return { title: chapter.title, count: getSceneWords(chapter.id) }
    })

    const avgWordsPerChapter = chapterStats.length > 0 ? totalWords / chapterStats.length : 0
    
    // Outliers heuristics
    const veryShortScenes = sceneStats.filter(s => s.wordCount > 0 && s.wordCount < 300)
    const veryLongScenes = sceneStats.filter(s => s.wordCount > 3000)
    
    const outlierChapters: ProjectStatsData['outlierChapters'] = []
    if (chapterStats.length > 3) {
        const avg = avgWordsPerChapter
        chapterStats.forEach(c => {
            if (c.count < avg * 0.4) outlierChapters.push({ ...c, status: 'low' })
            if (c.count > avg * 2.5) outlierChapters.push({ ...c, status: 'high' })
        })
    }

    const sortedScenes = [...sceneStats].sort((a, b) => b.wordCount - a.wordCount)
    const sortedChapters = [...chapterStats].sort((a, b) => b.count - a.count)

    return {
        totalWords,
        totalScenes: sceneNodes.length,
        totalChapters: chapterNodes.length,
        totalActs: actNodes.length,
        totalCharacters: assetCounts.characters,
        totalIdeas: assetCounts.ideas,
        estimatedReadingTime: Math.ceil(totalWords / 250),
        avgWordsPerScene,
        avgWordsPerChapter,
        longestScene: sortedScenes[0] ? { title: sortedScenes[0].title, count: sortedScenes[0].wordCount } : { title: 'N/A', count: 0 },
        shortestScene: sortedScenes.filter(s => s.wordCount > 0).reverse()[0] ? { title: sortedScenes.filter(s => s.wordCount > 0).reverse()[0].title, count: sortedScenes.filter(s => s.wordCount > 0).reverse()[0].wordCount } : { title: 'N/A', count: 0 },
        longestChapter: sortedChapters[0] ? sortedChapters[0] : { title: 'N/A', count: 0 },
        shortestChapter: sortedChapters.filter(c => c.count > 0).reverse()[0] ? sortedChapters.filter(c => c.count > 0).reverse()[0] : { title: 'N/A', count: 0 },
        emptyScenesCount: sceneStats.filter(s => s.wordCount === 0).length,
        scenesWithSummaryCount: 0, // Placeholder
        scenesWithProseCount: sceneStats.filter(s => s.wordCount > 0).length,
        archivedScenesCount: nodes.filter(n => n.type === 'scene' && n.deleted_at).length,
        
        percentProse: sceneStats.length > 0 ? (sceneStats.filter(s => s.wordCount > 0).length / sceneStats.length) * 100 : 0,
        percentSummary: 0,
        percentLinkedCharacters: sceneStats.length > 0 ? (sceneStats.filter(s => s.linkedCharactersCount > 0).length / sceneStats.length) * 100 : 0,
        percentLinkedIdeas: sceneStats.length > 0 ? (sceneStats.filter(s => s.linkedIdeasCount > 0).length / sceneStats.length) * 100 : 0,
        veryShortScenesCount: veryShortScenes.length,
        veryLongScenesCount: veryLongScenes.length,
        outlierChapters,

        sceneBreakdown: sceneStats
    }
}
