class Specie {
    constructor({ id, specie, created_by, created_at, deleted_at, deleted_by }) {
        this.id = id;
        this.specie = specie;
        this.created_by = created_by ?? null;
        this.created_at = created_at;
        this.deleted_at = deleted_at ?? null;
        this.deleted_by = deleted_by ?? null;
    }
}

module.exports = Specie;