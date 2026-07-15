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
  const [buscandoDupla, setBuscandoDupla] = useState([])
  const [loadingTorneos, setLoadingTorneos] = useState(true)
  const [loadingData, setLoadingData] = useState(false)

  const unsubZonasRef = useRef(null)
  const unsubPartidosRef = useRef(null)
  const unsubLlavesRef = useRef(null)
  const unsubBuscandoDuplaRef = useRef(null)

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

    if (unsubZonasRef.current) { unsubZonasRef.current(); unsubZonasRef.current = null }
    if (unsubPartidosRef.current) { unsubPartidosRef.current(); unsubPartidosRef.current = null }
    if (unsubLlavesRef.current) { unsubLlavesRef.current(); unsubLlavesRef.current = null }
    if (unsubBuscandoDuplaRef.current) { unsubBuscandoDuplaRef.current(); unsubBuscandoDuplaRef.current = null }

    setLoadingData(true)
    setZonas([])
    setPartidos([])
    setLlaves([])
    setBuscandoDupla([])

    unsubZonasRef.current = onSnapshot(
      query(collection(db, 'torneos', activeTorneoId, 'zonas'), orderBy('orden')),
      snap => setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

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

    unsubBuscandoDuplaRef.current = onSnapshot(
      query(collection(db, 'torneos', activeTorneoId, 'buscandoDupla'), orderBy('createdAt', 'desc')),
      snap => setBuscandoDupla(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )

    return () => {
      if (unsubZonasRef.current) { unsubZonasRef.current(); unsubZonasRef.current = null }
      if (unsubPartidosRef.current) { unsubPartidosRef.current(); unsubPartidosRef.current = null }
      if (unsubLlavesRef.current) { unsubLlavesRef.current(); unsubLlavesRef.current = null }
      if (unsubBuscandoDuplaRef.current) { unsubBuscandoDuplaRef.current(); unsubBuscandoDuplaRef.current = null }
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
      buscandoDupla,
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
