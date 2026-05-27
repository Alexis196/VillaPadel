import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const emailIsAdmin = ADMIN_EMAILS.includes(u.email?.toLowerCase())
        if (!emailIsAdmin) {
          const snap = await getDoc(doc(db, 'users', u.uid))
          setIsAdmin(snap.exists() && snap.data().rol === 'admin')
        } else {
          setIsAdmin(true)
        }
        setUser(u)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setAuthLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin, authLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
