// Minimal Dexie DB setup
import Dexie, { Table } from 'dexie'

export interface Todo {
  id?: number
  title: string
  completed?: boolean
}

export class AppDB extends Dexie {
  todos!: Table<Todo, number>

  constructor() {
    super('twsAppDB')
    this.version(1).stores({
      todos: '++id,title,completed',
    })
  }
}

export const db = new AppDB()

