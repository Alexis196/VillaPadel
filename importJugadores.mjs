/**
 * Script de carga: src/assets/jugadores.json → Firestore (colección "players")
 * Uso: node importJugadores.mjs
 */
import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// --- Leer .env manualmente (sin depender de dotenv) ---
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

// --- Mapa de categorías (igual que CAT_OPTIONS en la app) ---
const CAT_MAP = {
  1: { name: '1ra Categoría', color: '#f97316', id: 'cat-1ra' },
  2: { name: '2da Categoría', color: '#a855f7', id: 'cat-2da' },
  3: { name: '3ra Categoría', color: '#3b82f6', id: 'cat-3ra' },
  4: { name: '4ta Categoría', color: '#10b981', id: 'cat-4ta' },
  5: { name: '5ta Categoría', color: '#06b6d4', id: 'cat-5ta' },
  6: { name: '6ta Categoría', color: '#84cc16', id: 'cat-6ta' },
  7: { name: '7ma Categoría', color: '#eab308', id: 'cat-7ma' },
  8: { name: '8va Categoría', color: '#64748b', id: 'cat-8va' },
}

// --- Inicializar Firebase ---
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// --- Cargar JSON ---
const { jugadores } = JSON.parse(readFileSync('src/assets/jugadores.json', 'utf8'))

async function run() {
  console.log(`Importando ${jugadores.length} jugadores...`)
  let ok = 0
  let err = 0

  for (const j of jugadores) {
    const valor = Number(j.cat)
    const cat = CAT_MAP[valor]
    if (!cat) {
      console.warn(`  ⚠ Categoría desconocida "${j.cat}" para ${j.nombre} — saltando`)
      err++
      continue
    }

    const doc = {
      name:          j.nombre,
      sexo:          j.sexo,           // "M" o "F"
      categoriaValor:  valor,
      categoryName:  cat.name,
      categoryColor: cat.color,
      categoriaId:   cat.id,
    }

    try {
      await addDoc(collection(db, 'players'), doc)
      console.log(`  ✓ ${j.nombre} (${cat.name})`)
      ok++
    } catch (e) {
      console.error(`  ✗ ${j.nombre}:`, e.message)
      err++
    }
  }

  console.log(`\nListo: ${ok} importados, ${err} errores.`)
  process.exit(0)
}

run()
