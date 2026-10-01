class Pet {
    constructor({ id, specie_id, name, pet_picture, birthday, created_by, created_at, deleted_at, deleted_by }) {
        this.id = id;
        this.specie_id = specie_id;
        this.name = name;
        this.pet_picture = pet_picture;
        this.birthday = birthday;
        this.created_by = created_by;
        this.created_at = created_at;
        this.deleted_at = deleted_at ?? null;
        this.deleted_by = deleted_by ?? null;
    }
}

module.exports = Pet;