import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../firebase"
import { Navigate } from "react-router-dom"

interface Props {
  children: JSX.Element
}

const PrivateRoute = ({ children }: Props) => {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser as any)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return user ? children : <Navigate to="/login" />
}

export default PrivateRoute
