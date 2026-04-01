import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { getLinkedCharacters, addCharacterLink, removeCharacterLink, getLinkedIdeas, addIdeaLink, removeIdeaLink } from '../lib/supabase/scene-links'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLinks() {
    console.log('--- STARTING VALIDATION ---')
    
    // 1. Find a project
    const { data: project } = await supabase.from('projects').select('*').limit(1).single()
    if (!project) {
        console.log('No project found. Please create one first.')
        return
    }
    console.log(`Found Project: ${project.title} (${project.id})`)

    // 2. Find or create a scene
    let { data: scene } = await supabase.from('scenes').select('*').eq('project_id', project.id).limit(1).single()
    if (!scene) {
         console.log('No scenes found, testing requires at least 1 scene.')
         return
    }
    console.log(`Using Scene: ${scene.id}`)

    // 3. Find or create a Character
    let { data: character } = await supabase.from('characters').select('*').eq('project_id', project.id).limit(1).single()
    if (!character) {
        const { data: chars } = await supabase.from('characters').insert({ project_id: project.id, name: 'Test Character' }).select()
        character = chars?.[0]
    }
    console.log(`Using Character: ${character.name}`)

    // 4. Find or create an Idea
    let { data: idea } = await supabase.from('ideas').select('*').eq('project_id', project.id).limit(1).single()
    if (!idea) {
        const { data: ideas } = await supabase.from('ideas').insert({ project_id: project.id, title: 'Test Idea' }).select()
        idea = ideas?.[0]
    }
    console.log(`Using Idea: ${idea.title}`)

    // --- TEST 1: Linking Character ---
    console.log('\n[TEST] Linking Character...')
    await addCharacterLink(supabase as any, scene.id, character.id)
    const linkedChars = await getLinkedCharacters(supabase as any, scene.id)
    console.log(`Linked Characters Count: ${linkedChars.length}`)
    if (!linkedChars.find(c => c.id === character.id)) {
        throw new Error('Character linking failed!')
    }

    // --- TEST 2: Linking Idea ---
    console.log('\n[TEST] Linking Idea...')
    await addIdeaLink(supabase as any, scene.id, idea.id)
    const linkedIdeas = await getLinkedIdeas(supabase as any, scene.id)
    console.log(`Linked Ideas Count: ${linkedIdeas.length}`)
    if (!linkedIdeas.find(i => i.id === idea.id)) {
        throw new Error('Idea linking failed!')
    }

    // --- TEST 3: Preventing Duplicates ---
    console.log('\n[TEST] Preventing duplicates gracefully...')
    const result = await addCharacterLink(supabase as any, scene.id, character.id)
    if (result !== null) {
        throw new Error('Duplicate prevention logic failed (should return null when catching error code 23505)!')
    }
    console.log('Duplicate safely rejected.')

    // --- TEST 4: Unlinking Entities ---
    console.log('\n[TEST] Unlinking entities...')
    await removeCharacterLink(supabase as any, scene.id, character.id)
    const remainingChars = await getLinkedCharacters(supabase as any, scene.id)
    if (remainingChars.find(c => c.id === character.id)) {
        throw new Error('Character unlinking failed!')
    }
    console.log('Character successfully unlinked.')

    await removeIdeaLink(supabase as any, scene.id, idea.id)
    const remainingIdeas = await getLinkedIdeas(supabase as any, scene.id)
    if (remainingIdeas.find(i => i.id === idea.id)) {
        throw new Error('Idea unlinking failed!')
    }
    console.log('Idea successfully unlinked.')

    console.log('\n--- VALIDATION PASSED ---')
}

testLinks().catch(console.error)
