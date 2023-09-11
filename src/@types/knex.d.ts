declare module 'knex/types/tables' {
  export interface Tables {
    transactions: {
      id: string
      name: string
      description: string
      date_time: string
      diet: boolean
      session_id?: string
    }
  }
}
