class User {
    constructor({ id, role, plan, name, username, email, password, profile_picture, created_at }) {
        this.id = id;
        this.role = role || "common";
        this.plan = plan || "free";
        this.name = name;
        this.username = username;
        this.email = email;
        this.password = password;
        this.profile_picture = profile_picture;
        this.created_at = created_at;
    }
}

module.exports = User;