import { onSnapshot, query, collection } from "firebase/firestore"
import { db } from "../firebase"
import { useEffect, useState } from "react"

function ErrorHandler() {
  const [permissionError, setPermissionError] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "someCollection"))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // ...existing code to handle snapshot...
      },
      (error) => {
        if (error?.code === "permission-denied") {
          console.warn("Snapshot listener permission denied – disabling listener")
          setPermissionError(true)
          unsubscribe() // stop listening
        } else {
          console.error("Snapshot listener error:", error)
        }
      }
    )
    return () => unsubscribe()
  }, [])

  // ...existing code to render UI, possibly show permissionError banner...
}
