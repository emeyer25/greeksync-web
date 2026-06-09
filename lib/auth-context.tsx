'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface Chapter {
  id: string
  name: string
  slug: string
  super_admin_id: string | null
  greek_letters: string | null
  school: string | null
  description: string | null
}

export interface Member {
  id: string
  name: string
  position: string
  email: string | null
  role: 'admin' | 'editor' | 'member'
  chapter_id: string | null
  user_id: string | null
  permissions: string[]
}

// Permission keys
// 'calendar_write' — add / edit / delete events
// 'rushees_write'  — add / edit / delete rushees
// 'members_write'  — invite, add, delete members, change roles

const EDITOR_DEFAULT_PERMISSIONS = ['calendar_write', 'rushees_write']
const ADMIN_PERMISSIONS = ['calendar_write', 'rushees_write', 'members_write', 'positions_write']

interface AuthContextValue {
  user: User | null
  member: Member | null
  chapter: Chapter | null
  chapterId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  canEdit: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  can: (permission: string) => boolean
  refreshMember: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  member: null,
  chapter: null,
  chapterId: null,
  loading: true,
  signIn: async () => ({ error: 'Not initialized' }),
  signOut: async () => {},
  canEdit: false,
  isAdmin: false,
  isSuperAdmin: false,
  can: () => false,
  refreshMember: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMemberAndChapter = async (authUser: User) => {
    if (!supabase) { setLoading(false); return }

    let data: Member | null = null

    const { data: byUserId } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (byUserId) {
      data = byUserId as Member
    } else if (authUser.email) {
      const { data: byEmail } = await supabase
        .from('members')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle()
      data = byEmail as Member | null
    }

    // Normalise: ensure permissions is always an array
    if (data) {
      data = { ...data, permissions: data.permissions ?? [] }
    }

    setMember(data)

    if (data?.chapter_id) {
      const { data: chapterData } = await supabase
        .from('chapters')
        .select('id, name, slug, super_admin_id, greek_letters, school, description')
        .eq('id', data.chapter_id)
        .maybeSingle()
      setChapter(chapterData as Chapter | null)
    } else {
      setChapter(null)
    }

    setLoading(false)
  }

  const refreshMember = async () => {
    if (!supabase || !user) return
    await fetchMemberAndChapter(user)
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    supabase.auth.getUser().then(({ data }) => {
      const authUser = data.user ?? null
      setUser(authUser)
      if (authUser) {
        fetchMemberAndChapter(authUser)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (newUser) {
        fetchMemberAndChapter(newUser)
      } else {
        setMember(null)
        setChapter(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase not configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setMember(null)
    setChapter(null)
  }

  const isAdmin = !!(user && member?.role === 'admin')
  const isSuperAdmin = !!(user && chapter?.super_admin_id && user.id === chapter.super_admin_id)
  const canEdit = !supabase || !!(user && member && (member.role === 'admin' || member.role === 'editor'))

  // can() checks: admins have everything, others check their explicit permissions
  // plus the role's defaults
  const can = (permission: string): boolean => {
    if (!supabase) return true // open access when no auth configured
    if (!user || !member) return false
    if (member.role === 'admin') return ADMIN_PERMISSIONS.includes(permission)
    const effective = [
      ...(member.role === 'editor' ? EDITOR_DEFAULT_PERMISSIONS : []),
      ...(member.permissions ?? []),
    ]
    return effective.includes(permission)
  }

  const chapterId = member?.chapter_id ?? null

  return (
    <AuthContext.Provider value={{
      user, member, chapter, chapterId,
      loading, signIn, signOut, canEdit, isAdmin, isSuperAdmin, can,
      refreshMember,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
