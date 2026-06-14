export interface ReadRepository<TId, TRow> {
  findById(id: TId): Promise<TRow | null>;
}

export interface WriteRepository<TInsert, TUpdate, TRow> {
  create(input: TInsert): Promise<TRow>;
  update(id: string, input: TUpdate): Promise<TRow>;
}
