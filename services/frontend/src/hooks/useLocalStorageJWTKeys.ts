import { useMemo } from "react"
import { LOCAL_STORAGE } from "../constants"

const useLocalStorageJWTKeys = () => {
  const jwtKeys = localStorage.getItem(LOCAL_STORAGE)
  return useMemo(() => {
    if (jwtKeys) {
      return JSON.parse(jwtKeys)
    }

    return null
  }, [jwtKeys])
}

export default useLocalStorageJWTKeys
