import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const MASTER_EMAILS = (import.meta.env.VITE_MASTER_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [isMaster, setIsMaster]   = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const email       = u.email?.toLowerCase()
        const masterByEnv = MASTER_EMAILS.includes(email)
        const adminByEnv  = ADMIN_EMAILS.includes(email)

        let firestoreRol = null
        try {
          const snap = await getDoc(doc(db, 'users', u.uid))
          if (snap.exists()) firestoreRol = snap.data().rol
        } catch {}

        const master = masterByEnv || firestoreRol === 'master'
        const admin  = master || adminByEnv || firestoreRol === 'admin'

        setIsAdmin(admin)
        setIsMaster(master)
        setUser(u)
      } else {
        setUser(null)
        setIsAdmin(false)
        setIsMaster(false)
      }
      setAuthLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin, isMaster, authLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
