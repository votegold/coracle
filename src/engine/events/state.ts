import {Collection, Writable, writable} from "src/engine/core/utils"
import type {Event} from "./model"

export const _events = new Collection<Event>("id", 1000)
export const deletes = new Writable(new Set(), 1000)
export const deletesLastUpdated = writable(0)
