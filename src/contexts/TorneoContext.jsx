import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { collection, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

const TorneoContext = createContext(null)

export function TorneoProvider({ children }) {
  const [torneos, setTorneos] = useState([])
  const [activeTorneoId, setActiveTorneoId] = useState(null)
  const [zonas, setZonas] = useState([])
  const [partidos, setPartidos] = useState([])
  const [llaves, setLlaves] = useState([])
  const [loadingTorneos, setLoadingTorneos] = useState(true)
  const [loadingData, setLoadingData] = useState(false)

  const unsubPartidosRef = useRef(null)
  const unsubLlavesRef = useRef(null)

  useEffect(() => {
    setLoadingTorneos(true)
    getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setTorneos(list)
        setActiveTorneoId(prev => {
          if (prev && list.find(t => t.id === prev)) return prev
          const active = list.find(t => t.estado === 'En curso') || list.find(t => t.estado === 'Llave') || list[0]
          return active?.id || null
        })
        setLoadingTorneos(false)
      })
      .catch(() => setLoadingTorneos(false))
  }, [])

  function refreshTorneos() {
    getDocs(query(collection(db, 'torneos'), orderBy('createdAt', 'desc')))
      .then(snap => setTorneos(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }

  useEffect(() => {
    if (!activeTorneoId) return

    if (unsubPartidosRef.current) { unsubPartidosRef.current(); unsubPartidosRef.current = null }
    if (unsubLlavesRef.current) { unsubLlavesRef.current(); unsubLlavesRef.current = null }

    setLoadingData(true)
    setZonas([])
    setPartidos([])
    setLlaves([])

    getDocs(query(collection(db, 'torneos', activeTorneoId, 'zonas'), orderBy('orden')))
      .then(snap => setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))

    let firstLoad = true
    unsubPartidosRef.current = onSnapshot(
      collection(db, 'torneos', activeTorneoId, 'partidos'),
      snap => {
        setPartidos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        if (firstLoad) { setLoadingData(false); firstLoad = false }
      },
      () => setLoadingData(false)
    )

    unsubLlavesRef.current = onSnapshot(
      collection(db, 'torneos', activeTorneoId, 'llaves'),
      snap => setLlaves(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    return () => {
      if (unsubPartidosRef.current) { unsubPartidosRef.current(); unsubPartidosRef.current = null }
      if (unsubLlavesRef.current) { unsubLlavesRef.current(); unsubLlavesRef.current = null }
    }
  }, [activeTorneoId])

  const activeTorneo = torneos.find(t => t.id === activeTorneoId) || null

  return (
    <TorneoContext.Provider value={{
      torneos,
      activeTorneo,
      activeTorneoId,
      setActiveTorneoId,
      zonas,
      partidos,
      llaves,
      loading: loadingTorneos || loadingData,
      refreshTorneos,
    }}>
      {children}
    </TorneoContext.Provider>
  )
}

export function useTorneo() {
  const ctx = useContext(TorneoContext)
  if (!ctx) throw new Error('useTorneo must be used within TorneoProvider')
  return ctx
}
