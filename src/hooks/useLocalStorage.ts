import { writable } from "svelte/store";

export function useLocalStorage(key: string, defaultValue = '') {
    const write = writable(localStorage.getItem(key) ?? defaultValue)
    window.addEventListener('storage', (e) => {
        write.set(e.storageArea.getItem(key))
    })

    write.subscribe((v) => {
        localStorage.setItem(key, v)
    })

    return write
}