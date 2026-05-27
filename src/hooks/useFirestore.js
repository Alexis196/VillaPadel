import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useCollection(collectionName, constraints = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const ref = collection(db, collectionName)
      const q = constraints.length ? query(ref, ...constraints) : ref
      const snap = await getDocs(q)
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [collectionName])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
