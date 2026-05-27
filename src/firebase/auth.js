import { GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword as fbSignInEmail } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './config'

const provider = new GoogleAuthProvider()

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

async function resolveAdminStatus(user) {
  const isEmailAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase())
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || user.email,
      photoURL: user.photoURL || null,
      rol: isEmailAdmin ? 'admin' : 'viewer',
      createdAt: new Date(),
    })
  } else if (isEmailAdmin && userSnap.data().rol !== 'admin') {
    await setDoc(userRef, { rol: 'admin' }, { merge: true })
  }
  const rol = isEmailAdmin ? 'admin' : (userSnap.exists() ? userSnap.data().rol : 'viewer')
  return rol === 'admin'
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider)
  const isAdmin = await resolveAdminStatus(result.user)
  return { user: result.user, isAdmin }
}

export async function signInWithEmail(email, password) {
  const result = await fbSignInEmail(auth, email, password)
  const isAdmin = await resolveAdminStatus(result.user)
  return { user: result.user, isAdmin }
}

export function signOutUser() {
  return signOut(auth)
}
