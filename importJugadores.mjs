/**
 * Borra toda la colección "players" y reimporta desde src/assets/jugadores.json
 * Uso: node importJugadores.mjs
 */
import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, addDoc } from 'firebase/firestore'

// --- Leer .env manualmente ---
const env = {}
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && key.trim()) env[key.trim()] = rest.join('=').trim()
})

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
}

const CAT_MAP = {
  '1ra': { name: '1ra Categoría', color: '#f97316', id: 'cat-1ra', valor: 1 },
  '2da': { name: '2da Categoría', color: '#a855f7', id: 'cat-2da', valor: 2 },
  '3ra': { name: '3ra Categoría', color: '#3b82f6', id: 'cat-3ra', valor: 3 },
  '4ta': { name: '4ta Categoría', color: '#10b981', id: 'cat-4ta', valor: 4 },
  '5ta': { name: '5ta Categoría', color: '#06b6d4', id: 'cat-5ta', valor: 5 },
  '6ta': { name: '6ta Categoría', color: '#84cc16', id: 'cat-6ta', valor: 6 },
  '7ma': { name: '7ma Categoría', color: '#eab308', id: 'cat-7ma', valor: 7 },
  '8va': { name: '8va Categoría', color: '#64748b', id: 'cat-8va', valor: 8 },
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function run() {
  // 1. Borrar todos los jugadores existentes
  console.log('Borrando jugadores existentes...')
  const snap = await getDocs(collection(db, 'players'))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  console.log(`  ✓ ${snap.size} documentos eliminados`)

  // 2. Importar nuevo JSON
  const jugadores = JSON.parse(readFileSync('src/assets/jugadores.json', 'utf8'))
  console.log(`\nImportando ${jugadores.length} jugadores...`)

  let ok = 0
  let err = 0

  for (const j of jugadores) {
    const cat = CAT_MAP[j.categoryName]
    if (!cat) {
      console.warn(`  ⚠ Categoría desconocida "${j.categoryName}" para ${j.name} — saltando`)
      err++
      continue
    }

    try {
      await addDoc(collection(db, 'players'), {
        name:           j.name,
        sexo:           j.sexo,
        localidad:      j.localidad || '',
        categoryName:   cat.name,
        categoryColor:  cat.color,
        categoriaId:    cat.id,
        categoriaValor: cat.valor,
      })
      console.log(`  ✓ ${j.name} (${cat.name})`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${j.name}:`, e.message)
      err++
    }
  }

  console.log(`\nListo: ${ok} importados, ${err} errores.`)
  process.exit(0)
}

run()
