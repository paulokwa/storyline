export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type ProjectType = 'tv_script' | 'novel'
export type WritingMode = 'simple' | 'screenplay'
export type NodeType = 'episode' | 'act' | 'scene' | 'chapter'

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    display_name: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    display_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    display_name?: string | null
                    created_at?: string
                }
            }
            projects: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    type: ProjectType
                    writing_mode: WritingMode
                    premise: string | null
                    tone: string | null
                    setting: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title?: string
                    type: ProjectType
                    writing_mode?: WritingMode
                    premise?: string | null
                    tone?: string | null
                    setting?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    type?: ProjectType
                    writing_mode?: WritingMode
                    premise?: string | null
                    tone?: string | null
                    setting?: string | null
                    updated_at?: string
                }
            }
            structure_nodes: {
                Row: {
                    id: string
                    project_id: string
                    parent_id: string | null
                    type: NodeType
                    title: string
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    parent_id?: string | null
                    type: NodeType
                    title?: string
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    parent_id?: string | null
                    type?: NodeType
                    title?: string
                    order_index?: number
                }
            }
            scenes: {
                Row: {
                    id: string
                    node_id: string
                    project_id: string
                    content: Json | null
                    writing_mode: WritingMode
                    updated_at: string
                }
                Insert: {
                    id?: string
                    node_id: string
                    project_id: string
                    content?: Json | null
                    writing_mode?: WritingMode
                    updated_at?: string
                }
                Update: {
                    id?: string
                    content?: Json | null
                    writing_mode?: WritingMode
                    updated_at?: string
                }
            }
            characters: {
                Row: {
                    id: string
                    project_id: string
                    name: string
                    description: string | null
                    notes: string | null
                    order_index: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    name: string
                    description?: string | null
                    notes?: string | null
                    order_index?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    notes?: string | null
                    order_index?: number
                }
            }
            ideas: {
                Row: {
                    id: string
                    project_id: string
                    title: string | null
                    content: string | null
                    order_index: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    title?: string | null
                    content?: string | null
                    order_index?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string | null
                    content?: string | null
                    order_index?: number
                    updated_at?: string
                }
            }
        }
    }
}
