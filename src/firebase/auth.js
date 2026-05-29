import { GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword as fbSignInEmail, sendPasswordResetEmail as fbSendReset } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './config'

const provider = new GoogleAuthProvider()

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const MASTER_EMAILS = (import.meta.env.VITE_MASTER_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

async function resolveAdminStatus(user) {
  const email = user.email?.toLowerCase()
  const isMasterUser = MASTER_EMAILS.includes(email)
  const isEnvAdmin   = ADMIN_EMAILS.includes(email)

  const userRef  = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  const existingRol = userSnap.exists() ? userSnap.data().rol : null

  let isFirestoreAdmin = false
  if (!isMasterUser && !isEnvAdmin) {
    if (existingRol === 'admin') {
      isFirestoreAdmin = true
    } else {
      try {
        const configSnap = await getDoc(doc(db, 'config', 'admins'))
        if (configSnap.exists()) {
          const emails = (configSnap.data().emails || []).map(e => e.toLowerCase())
          isFirestoreAdmin = emails.includes(email)
        }
      } catch {
        // Las reglas de Firestore pueden bloquear la lectura de config/admins
      }
    }
  }

  const isAdmin = isMasterUser || isEnvAdmin || isFirestoreAdmin
  const rol = isMasterUser ? 'master' : (isAdmin ? 'admin' : 'viewer')

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || user.email,
      photoURL: user.photoURL || null,
      rol,
      createdAt: new Date(),
    })
  } else if (userSnap.data().rol !== rol) {
    await setDoc(userRef, { rol }, { merge: true })
  }

  return { isAdmin, isMaster: isMasterUser }
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  const { isAdmin, isMaster } = await resolveAdminStatus(result.user)
  return { user: result.user, isAdmin, isMaster }
}

export async function signInWithEmail(email, password) {
  const result = await fbSignInEmail(auth, email, password)
  const { isAdmin, isMaster } = await resolveAdminStatus(result.user)
  return { user: result.user, isAdmin, isMaster }
}

export async function sendPasswordReset(email) {
  return fbSendReset(auth, email)
}

export function signOutUser() {
  return signOut(auth)
}
